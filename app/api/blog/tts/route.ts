import { NextResponse } from "next/server";
import crypto from "crypto";
import WebSocket from "ws";
import { getPublicPost } from "@/lib/blog";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "blog-audio";

const VOICES: Record<string, string> = {
  "hoaimy": "vi-VN-HoaiMyNeural",
  "namminh": "vi-VN-NamMinhNeural",
};

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const SEC_MS_GEC_VERSION = "1-130.0.2849.68";

function generateSecMsGec(): string {
  // Windows file time ticks (100ns since 1601-01-01), rounded to 5-minute boundary.
  const ticks = BigInt(Date.now()) * 10000n + 116444736000000000n;
  const rounded = ticks - (ticks % 3000000000n);
  return crypto
    .createHash("sha256")
    .update(`${rounded.toString()}${TRUSTED_CLIENT_TOKEN}`)
    .digest("hex")
    .toUpperCase();
}

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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

function synthesizeOnce(text: string, voice: string, timeoutMs = 30_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const connectId = crypto.randomUUID().replace(/-/g, "");
    const gec = generateSecMsGec();
    const url =
      `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1` +
      `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
      `&Sec-MS-GEC=${gec}` +
      `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}` +
      `&ConnectionId=${connectId}`;

    const ws = new WebSocket(url, {
      headers: {
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
      },
    });

    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error("tts timeout"));
    }, timeoutMs);

    const cleanup = (err?: Error, data?: Buffer) => {
      clearTimeout(timer);
      try { ws.close(); } catch {}
      if (err) reject(err);
      else resolve(data!);
    };

    ws.on("open", () => {
      const now = new Date().toUTCString();
      const configMsg =
        `X-Timestamp:${now}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
      ws.send(configMsg);

      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escapeXml(text)}</prosody></voice></speak>`;
      const ssmlMsg =
        `X-RequestId:${connectId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${now}\r\n` +
        `Path:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    });

    ws.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
      if (isBinary) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        // Binary frame: first 2 bytes = header length (big-endian), followed by header, then audio.
        if (buf.length < 2) return;
        const headerLen = buf.readUInt16BE(0);
        const audio = buf.subarray(2 + headerLen);
        if (audio.length) chunks.push(audio);
      } else {
        const msg = data.toString();
        if (msg.includes("Path:turn.end")) {
          cleanup(undefined, Buffer.concat(chunks));
        }
      }
    });

    ws.on("error", (e) => cleanup(e));
    ws.on("close", (code, reason) => {
      if (!chunks.length) {
        cleanup(new Error(`tts closed ${code} ${reason?.toString() || ""}`.trim()));
      }
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
        await new Promise((r) => setTimeout(r, 400 * Math.pow(3, attempt)));
      }
    }
    if (!ok) throw lastErr || new Error("tts chunk failed");
    buffers.push(ok);
  }
  return Buffer.concat(buffers);
}

// Google Translate TTS fallback — chunks must be ≤ 200 chars, lang `vi`.
async function synthesizeGoogle(text: string): Promise<Buffer> {
  const chunks = splitForTts(text, 190);
  const parts: Buffer[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const url =
      `https://translate.google.com/translate_tts` +
      `?ie=UTF-8&q=${encodeURIComponent(chunks[i])}` +
      `&tl=vi&total=${chunks.length}&idx=${i}&textlen=${chunks[i].length}` +
      `&client=tw-ob&prev=input&ttsspeed=1`;
    let lastErr: any = null;
    let got: Buffer | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Referer": "https://translate.google.com/",
            "Accept": "audio/mpeg,*/*",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
          },
        });
        if (!res.ok) throw new Error(`gtts ${res.status}`);
        got = Buffer.from(await res.arrayBuffer());
        break;
      } catch (e: any) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
      }
    }
    if (!got) throw lastErr || new Error("gtts chunk failed");
    parts.push(got);
  }
  return Buffer.concat(parts);
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
  let engine: "edge" | "google" = "edge";
  try {
    audio = await synthesize(trimmed, voice);
  } catch (edgeErr: any) {
    try {
      audio = await synthesizeGoogle(trimmed);
      engine = "google";
    } catch (gErr: any) {
      return NextResponse.json(
        {
          error:
            "tts failed: edge=" +
            (edgeErr?.message || "unknown") +
            " / google=" +
            (gErr?.message || "unknown"),
        },
        { status: 502 },
      );
    }
  }

  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl, cached: false, voice: voiceKey, engine });
}
