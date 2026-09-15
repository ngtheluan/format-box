import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { createReadStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// MachuTeam works on iPhone because it serves plain .mp3 files. YouTube's
// audio-only .m4a (AAC in MP4) is refused by iOS Safari's streaming code path
// even with proper Range headers. We convert the YouTube audio to MP3 via
// yt-dlp+ffmpeg, cache the .mp3 on disk, then serve it exactly like a static
// MP3 file — identical shape to MachuTeam's audio.

const CACHE_DIR = path.join(os.tmpdir(), "fb-podcast-cache");
const inflight = new Map<string, Promise<string>>();

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function fileSize(p: string): Promise<number> {
  try {
    const s = await fs.stat(p);
    return s.isFile() ? s.size : 0;
  } catch {
    return 0;
  }
}

async function downloadMp3(videoId: string): Promise<string> {
  await ensureCacheDir();
  const finalPath = path.join(CACHE_DIR, `${videoId}.mp3`);
  if ((await fileSize(finalPath)) > 0) return finalPath;

  const existing = inflight.get(videoId);
  if (existing) return existing;

  const job = new Promise<string>((resolve, reject) => {
    // yt-dlp -x --audio-format mp3 downloads best audio and re-encodes to MP3
    // via ffmpeg. Output template gets the correct .mp3 extension applied by
    // the postprocessor.
    const outTemplate = path.join(CACHE_DIR, `${videoId}.%(ext)s`);
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const baseArgs = [
      "--no-warnings",
      "--no-progress",
      "-f",
      "bestaudio",
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "128k",
      "-o",
      outTemplate,
    ];
    const withCookies = ["--cookies-from-browser", "chrome", ...baseArgs, url];
    const withoutCookies = [...baseArgs, url];

    const attempt = (args: string[], retry: boolean) => {
      const child = spawn("yt-dlp", args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderrBuf = "";
      child.stderr.on("data", (b: Buffer) => {
        stderrBuf += b.toString();
        if (stderrBuf.length > 8192) stderrBuf = stderrBuf.slice(-8192);
      });
      child.on("exit", async (code) => {
        if (code === 0) {
          const size = await fileSize(finalPath);
          if (size > 0) return resolve(finalPath);
          // Sometimes yt-dlp keeps the .m4a next to the .mp3 — pick whichever exists.
          const files = (await fs.readdir(CACHE_DIR)).filter((n) => n.startsWith(`${videoId}.`) && n.endsWith(".mp3"));
          if (files[0]) return resolve(path.join(CACHE_DIR, files[0]));
          reject(new Error("mp3 not produced"));
        } else if (retry) {
          attempt(withoutCookies, false);
        } else {
          inflight.delete(videoId);
          reject(new Error(`yt-dlp exit ${code}: ${stderrBuf.slice(-200)}`));
        }
      });
      child.on("error", (e) => {
        inflight.delete(videoId);
        reject(e);
      });
    };
    attempt(withCookies, true);
  });

  const wrapped = job.finally(() => inflight.delete(videoId));
  inflight.set(videoId, wrapped);
  return wrapped;
}

function parseRange(header: string | null, total: number) {
  if (!header) return { start: 0, end: total - 1 };
  const m = header.match(/bytes=(\d+)-(\d*)/);
  if (!m) return { start: 0, end: total - 1 };
  const start = parseInt(m[1], 10);
  const end = m[2] ? Math.min(parseInt(m[2], 10), total - 1) : total - 1;
  return { start, end };
}

function serveMp3(filePath: string, total: number, rangeHeader: string | null) {
  const { start, end } = parseRange(rangeHeader, total);
  const nodeStream = createReadStream(filePath, { start, end });
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    status: rangeHeader ? 206 : 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("slug");
  if (!videoId) return new Response("missing slug", { status: 400 });
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return new Response("bad slug", { status: 400 });

  await ensureCacheDir();
  let filePath: string;
  try {
    filePath = await downloadMp3(videoId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(`download failed: ${msg}`, { status: 502 });
  }

  const total = await fileSize(filePath);
  if (!total) return new Response("empty file", { status: 502 });

  return serveMp3(filePath, total, req.headers.get("range"));
}
