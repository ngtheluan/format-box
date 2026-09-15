import { NextRequest } from "next/server";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

const CACHE_DIR = path.join(os.tmpdir(), "fb-podcast-cache");

type Job = {
  partPath: string;
  finalPath: string;
  totalSize: number;
  finalize: Promise<string>;
  isDone: boolean;
};
const jobs = new Map<string, Job>();

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

// Ask yt-dlp for the exact filesize of the chosen audio format without
// downloading anything. Fast (~2s) — the response is signed by YouTube in a
// single innertube call, so we can set Content-Length upfront (iOS Safari
// refuses audio streams without a known Content-Length).
async function probeSize(videoId: string): Promise<number> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const args = [
    "--print",
    "%(filesize,filesize_approx)s",
    "--skip-download",
    "-f",
    "bestaudio[ext=m4a]/bestaudio",
    "--no-warnings",
  ];
  const run = async (extra: string[]) => {
    const { stdout } = await execFileAsync("yt-dlp", [...extra, ...args, url], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    const n = parseInt(stdout.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  try {
    return await run(["--cookies-from-browser", "chrome"]);
  } catch {
    return await run([]);
  }
}

function startJob(videoId: string, totalSize: number): Job {
  const existing = jobs.get(videoId);
  if (existing) return existing;

  const finalPath = path.join(CACHE_DIR, `${videoId}.m4a`);
  const partPath = `${finalPath}.part`;

  const finalize = new Promise<string>((resolve, reject) => {
    ensureCacheDir()
      .then(() => {
        const args = [
          "--no-warnings",
          "--no-progress",
          "-f",
          "bestaudio[ext=m4a]/bestaudio",
          "-o",
          partPath,
          "--no-part",
          `https://www.youtube.com/watch?v=${videoId}`,
        ];
        const withCookies = ["--cookies-from-browser", "chrome", ...args];

        const attempt = (finalArgs: string[], retry: boolean) => {
          const child = spawn("yt-dlp", finalArgs, { stdio: ["ignore", "ignore", "pipe"] });
          let stderrBuf = "";
          child.stderr.on("data", (b: Buffer) => {
            stderrBuf += b.toString();
            if (stderrBuf.length > 4096) stderrBuf = stderrBuf.slice(-4096);
          });
          child.on("exit", async (code) => {
            if (code === 0) {
              try {
                await fs.rename(partPath, finalPath).catch(() => {});
                const j = jobs.get(videoId);
                if (j) j.isDone = true;
                resolve(finalPath);
              } catch (e) {
                reject(e);
              }
            } else if (retry) {
              attempt(args, false);
            } else {
              jobs.delete(videoId);
              reject(new Error(`yt-dlp exit ${code}: ${stderrBuf.slice(-200)}`));
            }
          });
          child.on("error", (e) => {
            jobs.delete(videoId);
            reject(e);
          });
        };
        attempt(withCookies, true);
      })
      .catch(reject);
  });

  const job: Job = { partPath, finalPath, totalSize, finalize, isDone: false };
  jobs.set(videoId, job);
  return job;
}

// Cap open-ended Range requests so we don't block waiting for the entire
// file to hit disk before flushing anything. The browser will keep asking
// for further chunks as playback advances.
const OPEN_RANGE_CHUNK = 2 * 1024 * 1024; // 2 MB

function parseRange(header: string | null, total: number, capOpenEnd = false) {
  if (!header) return { start: 0, end: total - 1 };
  const m = header.match(/bytes=(\d+)-(\d*)/);
  if (!m) return { start: 0, end: total - 1 };
  const start = parseInt(m[1], 10);
  const naturalEnd = m[2] ? Math.min(parseInt(m[2], 10), total - 1) : total - 1;
  const end =
    capOpenEnd && !m[2]
      ? Math.min(start + OPEN_RANGE_CHUNK - 1, total - 1)
      : naturalEnd;
  return { start, end };
}

function serveCached(filePath: string, total: number, rangeHeader: string | null) {
  const { start, end } = parseRange(rangeHeader, total);
  const nodeStream = createReadStream(filePath, { start, end });
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    status: rangeHeader ? 206 : 200,
    headers: {
      "Content-Type": "audio/mp4",
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

// Wait until the growing part file (or the finalised final file) contains at
// least `upto` bytes. Polls at 250ms. Returns the path to read from.
async function waitForBytes(job: Job, upto: number): Promise<string> {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // Bound to avoid a hung read blocking a request forever.
  for (let i = 0; i < 4 * 60 * 5 /* 5 min */; i++) {
    const active = job.isDone ? job.finalPath : job.partPath;
    const size = await fileSize(active);
    if (size >= upto) return active;
    if (job.isDone && size < upto) return active; // truncated; caller will see EOF
    await wait(250);
  }
  throw new Error("timeout waiting for bytes");
}

// Serve a byte range while the file is still being downloaded. Waits until
// enough bytes are on disk, then reads that slice.
async function serveRangeDuringDownload(job: Job, rangeHeader: string | null) {
  const total = job.totalSize;
  const { start, end } = parseRange(rangeHeader, total, true);
  let activePath: string;
  try {
    activePath = await waitForBytes(job, end + 1);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(`wait failed: ${msg}`, { status: 504 });
  }
  const nodeStream = createReadStream(activePath, { start, end });
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    status: 206,
    headers: {
      "Content-Type": "audio/mp4",
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("slug");
  if (!videoId) return new Response("missing slug", { status: 400 });
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return new Response("bad slug", { status: 400 });

  await ensureCacheDir();
  const finalPath = path.join(CACHE_DIR, `${videoId}.m4a`);
  const cachedSize = await fileSize(finalPath);

  // Fully cached: seekable Range response.
  if (cachedSize > 0) {
    return serveCached(finalPath, cachedSize, req.headers.get("range"));
  }

  // Cold: probe total size, then kick off download.
  let job = jobs.get(videoId);
  if (!job) {
    const size = await probeSize(videoId).catch(() => 0);
    if (!size) return new Response("size probe failed", { status: 502 });
    job = startJob(videoId, size);
  }

  // iOS Safari requires proper Range/206 support with a known total size.
  // We always advertise Accept-Ranges + Content-Length and honour Range even
  // during the download by waiting for the needed slice to hit disk.
  return serveRangeDuringDownload(job, req.headers.get("range"));
}
