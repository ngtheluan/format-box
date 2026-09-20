import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import {
  createReadStream,
  statSync,
  mkdirSync,
  renameSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Download best m4a audio via yt-dlp (format 18 is no longer available on
// YouTube). Serve from a temp file with full Range support for seeking.

const YTDLP_FORMAT = "ba[ext=m4a]";
const CACHE_DIR = join(tmpdir(), "belai-cache");

type CacheEntry = { path: string; expiresAt: number; size: number };
const fileCache = new Map<string, CacheEntry>();
const downloading = new Map<string, Promise<CacheEntry>>();

function ensureCacheDir() {
  mkdirSync(CACHE_DIR, { recursive: true });
}

function getCached(videoId: string): CacheEntry | null {
  const cached = fileCache.get(videoId);
  if (!cached || cached.expiresAt <= Date.now()) {
    fileCache.delete(videoId);
    return null;
  }
  try { statSync(cached.path); } catch { fileCache.delete(videoId); return null; }
  return cached;
}

function downloadAudio(videoId: string): Promise<CacheEntry> {
  const existing = downloading.get(videoId);
  if (existing) return existing;

  const p = new Promise<CacheEntry>((resolve, reject) => {
    ensureCacheDir();
    const outPath = join(CACHE_DIR, `${videoId}.m4a`);
    const tmpPath = outPath + ".tmp";

    const cached = getCached(videoId);
    if (cached) return resolve(cached);

    const args = [
      "--no-warnings", "--no-progress", "-q",
      "-f", YTDLP_FORMAT,
      "-o", tmpPath, "--no-part", "--force-overwrites",
      `https://www.youtube.com/watch?v=${videoId}`,
    ];
    const child = spawn("yt-dlp", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (b: Buffer) => {
      stderr += b.toString();
      if (stderr.length > 4096) stderr = stderr.slice(-4096);
    });
    child.on("exit", (code) => {
      if (code === 0) try { statSync(tmpPath); } catch { return reject(new Error("output file missing")); }
      if (code === 0) {
        renameSync(tmpPath, outPath);
        const size = statSync(outPath).size;
        const entry: CacheEntry = { path: outPath, expiresAt: Date.now() + 4 * 3600_000, size };
        fileCache.set(videoId, entry);
        resolve(entry);
      } else {
        reject(new Error(`yt-dlp exit ${code}: ${stderr.slice(-200)}`));
      }
    });
    child.on("error", reject);
  }).finally(() => downloading.delete(videoId));

  downloading.set(videoId, p);
  return p;
}

function nodeToWeb(nodeStream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (e) => controller.error(e));
    },
    cancel() {
      if ("destroy" in nodeStream && typeof nodeStream.destroy === "function") {
        (nodeStream as NodeJS.ReadableStream & { destroy: () => void }).destroy();
      }
    },
  });
}

function serveFile(path: string, totalSize: number, rangeHeader: string | null): NextResponse {
  const contentType = "audio/mp4";
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1]);
      const end = match[2] ? parseInt(match[2]) : totalSize - 1;
      return new NextResponse(nodeToWeb(createReadStream(path, { start, end })), {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
        },
      });
    }
  }
  return new NextResponse(nodeToWeb(createReadStream(path)), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(totalSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("slug");
  if (!videoId) return NextResponse.json({ error: "missing slug" }, { status: 400 });
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "bad slug" }, { status: 400 });
  }

  const stream = req.nextUrl.searchParams.get("stream") === "1";

  if (!stream) {
    downloadAudio(videoId).catch(() => {});
    return NextResponse.json({
      audioUrl: `/api/podcasts/truyenmabelai?slug=${videoId}&stream=1`,
    });
  }

  const rangeHeader = req.headers.get("range");
  const cached = getCached(videoId);
  if (cached) return serveFile(cached.path, cached.size, rangeHeader);

  try {
    const entry = await downloadAudio(videoId);
    return serveFile(entry.path, entry.size, rangeHeader);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: `download failed: ${msg}` }, { status: 502 });
  }
}
