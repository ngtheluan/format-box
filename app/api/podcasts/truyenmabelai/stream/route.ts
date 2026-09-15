import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { createReadStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CACHE_DIR = path.join(os.tmpdir(), "fb-podcast-cache");

type Job = {
  partPath: string;
  finalPath: string;
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

// Start (or reuse) a single yt-dlp process for this videoId that writes the
// audio to disk. Concurrent requests tail-read the same growing file.
function startJob(videoId: string): Job {
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
        // Chrome cookies bypass YouTube's per-IP rate limit.
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
                const job = jobs.get(videoId);
                if (job) job.isDone = true;
                resolve(finalPath);
              } catch (e) {
                reject(e);
              }
            } else if (retry) {
              // Retry without cookies (Chrome might not be running).
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

  const job: Job = { partPath, finalPath, finalize, isDone: false };
  jobs.set(videoId, job);
  return job;
}

function parseRange(header: string | null, total: number) {
  if (!header) return { start: 0, end: total - 1 };
  const m = header.match(/bytes=(\d+)-(\d*)/);
  if (!m) return { start: 0, end: total - 1 };
  const start = parseInt(m[1], 10);
  const end = m[2] ? Math.min(parseInt(m[2], 10), total - 1) : total - 1;
  return { start, end };
}

function serveCached(filePath: string, total: number, rangeHeader: string | null) {
  const { start, end } = parseRange(rangeHeader, total);
  const nodeStream = createReadStream(filePath, { start, end });
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
  const headers = new Headers({
    "Content-Type": "audio/mp4",
    "Accept-Ranges": "bytes",
    "Content-Length": String(end - start + 1),
    "Content-Range": `bytes ${start}-${end}/${total}`,
    "Cache-Control": "private, max-age=3600",
  });
  return new Response(webStream, {
    status: rangeHeader ? 206 : 200,
    headers,
  });
}

// Tail-read the growing part file while yt-dlp writes it. Keeps polling for
// new bytes until the job resolves. Delivers a continuous audio stream.
function tailStream(job: Job): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let position = 0;
      let closed = false;
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

      const pump = async () => {
        while (!closed) {
          const activePath = job.isDone ? job.finalPath : job.partPath;
          const size = await fileSize(activePath);
          if (size > position) {
            const stream = createReadStream(activePath, { start: position, end: size - 1 });
            for await (const chunk of stream) {
              controller.enqueue(new Uint8Array(chunk as Buffer));
              position += (chunk as Buffer).length;
            }
          } else if (job.isDone) {
            controller.close();
            return;
          } else {
            await wait(250);
          }
        }
      };

      job.finalize.catch((e) => {
        try {
          controller.error(e);
        } catch {
          /* already closed */
        }
        closed = true;
      });

      pump().catch((e) => {
        try {
          controller.error(e);
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      // Job stays alive so other clients keep receiving bytes.
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
  if (cachedSize > 0) return serveCached(finalPath, cachedSize, req.headers.get("range"));

  const job = startJob(videoId);

  // Range request during download: wait for the download to finish, then
  // serve the requested range. Progressive streaming can't honor Range mid-download.
  if (req.headers.get("range")) {
    try {
      await job.finalize;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      return new Response(`download failed: ${msg}`, { status: 502 });
    }
    const total = await fileSize(finalPath);
    if (!total) return new Response("empty file", { status: 502 });
    return serveCached(finalPath, total, req.headers.get("range"));
  }

  // No Range: pipe bytes as they land on disk.
  const stream = tailStream(job);
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "audio/mp4",
      "Cache-Control": "private, no-store",
      "Accept-Ranges": "none",
    },
  });
}
