import { NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { getPublicPost } from "@/lib/blog";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "blog-audio";

const VOICES: Record<string, string> = {
  "hoaimy": "vi-VN-HoaiMyNeural",
  "namminh": "vi-VN-NamMinhNeural",
};

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>]+/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{2,}/g, ". ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function splitForTts(text: string, max = 2200): string[] {
  const sentences = text.split(/(?<=[.!?…])\s+/);
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).length > max) {
      if (cur) out.push(cur.trim());
      if (s.length > max) {
        for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
        cur = "";
      } else {
        cur = s;
      }
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function synthesizeOnce(text: string, voice: string, timeoutMs = 30_000): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      try {
        (audioStream as any).destroy?.();
      } catch {}
      reject(new Error("tts timeout"));
    }, timeoutMs);
    audioStream.on("data", (c: Buffer) => chunks.push(c));
    audioStream.on("end", () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks));
    });
    audioStream.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function synthesize(text: string, voice: string): Promise<Buffer> {
  const chunks = splitForTts(text);
  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    let lastErr: any = null;
    let ok: Buffer | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        ok = await synthesizeOnce(chunk, voice);
        break;
      } catch (e: any) {
        lastErr = e;
        // Exponential backoff: 400ms, 1200ms.
        await new Promise((r) => setTimeout(r, 400 * Math.pow(3, attempt)));
      }
    }
    if (!ok) throw lastErr || new Error("tts chunk failed");
    buffers.push(ok);
  }
  return Buffer.concat(buffers);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const voiceKey = (searchParams.get("voice") || "hoaimy").toLowerCase();
  const refresh = searchParams.get("refresh") === "1";
  const voice = VOICES[voiceKey] || VOICES.hoaimy;

  if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });

  const post = await getPublicPost(slug);
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  let sb;
  try {
    sb = supabaseAdmin();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const path = `${slug}-${voiceKey}.mp3`;

  if (!refresh) {
    const { data: existing } = await sb.storage.from(BUCKET).list("", { search: path });
    if (existing && existing.find((f) => f.name === path)) {
      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
      return NextResponse.json({ url: pub.publicUrl, cached: true, voice: voiceKey });
    }
  }

  const text = `${post.title}. ${stripMarkdown(post.markdown)}`;
  const trimmed = text.slice(0, 6000);

  let audio: Buffer;
  try {
    audio = await synthesize(trimmed, voice);
  } catch (e: any) {
    return NextResponse.json({ error: "tts failed: " + (e?.message || "unknown") }, { status: 502 });
  }

  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl, cached: false, voice: voiceKey });
}
