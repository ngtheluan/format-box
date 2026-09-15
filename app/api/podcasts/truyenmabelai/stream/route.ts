import { NextRequest } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Resolve YouTube's direct progressive mp4 URL via yt-dlp -g, then proxy the
// bytes through here so the browser sees a same-origin stream (googlevideo URLs
// are IP-bound and 403 when hit directly from the client).
//
// This replaces the old yt-dlp+ffmpeg → mp3 pipeline: no transcoding means the
// first byte arrives within ~1–2s (just the -g call), which keeps iOS Safari
// happy — its media element aborts if headers take longer than ~20–30s.
// The client uses a <video playsinline> element (mediaKind: "video") because
// iOS Safari refuses YouTube's audio-only m4a in <audio> even with valid Range
// responses, but it plays combined mp4 in <video> fine.

type CacheEntry = { url: string; expiresAt: number };
const urlCache = new Map<string, CacheEntry>();

// Format selection: prefer smallest combined mp4 (video+audio muxed) so we get
// a byte-seekable progressive file — separated adaptive streams don't work in
// a plain <video src>. 360p combined mp4 is the last format YouTube still ships
// as a single file, and its audio is the same 128k AAC we care about.
const YTDLP_FORMAT = "best[ext=mp4][acodec!=none][vcodec!=none]/best[ext=mp4]/best";

function resolveVideoUrl(videoId: string, useCookies: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      ...(useCookies ? ["--cookies-from-browser", "chrome"] : []),
      "--no-warnings",
      "--no-progress",
      "-g",
      "-f",
      YTDLP_FORMAT,
      url,
    ];
    const child = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b: Buffer) => (stdout += b.toString()));
    child.stderr.on("data", (b: Buffer) => {
      stderr += b.toString();
      if (stderr.length > 8192) stderr = stderr.slice(-8192);
    });
    child.on("exit", (code) => {
      if (code === 0) {
        const line = stdout.trim().split("\n").filter(Boolean)[0];
        if (line) return resolve(line);
        return reject(new Error("no url in yt-dlp output"));
      }
      reject(new Error(`yt-dlp exit ${code}: ${stderr.slice(-200)}`));
    });
    child.on("error", reject);
  });
}

async function getUpstreamUrl(videoId: string): Promise<string> {
  const now = Date.now();
  const cached = urlCache.get(videoId);
  // Refresh a minute before expiry to avoid mid-playback 403s.
  if (cached && cached.expiresAt > now + 60_000) return cached.url;

  let url: string;
  try {
    url = await resolveVideoUrl(videoId, true);
  } catch {
    url = await resolveVideoUrl(videoId, false);
  }
  // googlevideo URLs typically live ~6h; cache for 5h to leave a safety margin.
  urlCache.set(videoId, { url, expiresAt: now + 5 * 60 * 60 * 1000 });
  return url;
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

function copyHeaders(from: Headers, keys: string[]): HeadersInit {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = from.get(k);
    if (v) out[k] = v;
  }
  return out;
}

async function proxy(req: NextRequest, upstream: string, videoId: string, isHead: boolean): Promise<Response> {
  // Forward the client's Range so seeking works; add a browser-ish UA because
  // googlevideo sometimes rejects "node/undici" clients.
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  };
  const range = req.headers.get("range");
  if (range) headers["Range"] = range;

  let upstreamRes = await fetch(upstream, { method: isHead ? "HEAD" : "GET", headers, cache: "no-store" });

  // URL expired or rotated between resolve and use — refresh once.
  if (upstreamRes.status === 403 || upstreamRes.status === 410) {
    urlCache.delete(videoId);
    const fresh = await getUpstreamUrl(videoId);
    upstreamRes = await fetch(fresh, { method: isHead ? "HEAD" : "GET", headers, cache: "no-store" });
  }

  const passthrough = copyHeaders(upstreamRes.headers, [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "last-modified",
    "etag",
  ]) as Record<string, string>;
  // Some googlevideo responses omit Accept-Ranges even though they support Range.
  if (!passthrough["accept-ranges"]) passthrough["accept-ranges"] = "bytes";
  // Normalize content-type: iOS is happier with a media type it recognizes.
  if (!passthrough["content-type"] || passthrough["content-type"].startsWith("application/")) {
    passthrough["content-type"] = "video/mp4";
  }
  passthrough["cache-control"] = "private, max-age=0, no-store";

  // Strip hop-by-hop just in case fetch surfaced any.
  for (const k of Object.keys(passthrough)) {
    if (HOP_BY_HOP.has(k.toLowerCase())) delete passthrough[k];
  }

  return new Response(isHead ? null : upstreamRes.body, {
    status: upstreamRes.status,
    headers: passthrough,
  });
}

function validate(videoId: string | null): { ok: true; id: string } | { ok: false; res: Response } {
  if (!videoId) return { ok: false, res: new Response("missing slug", { status: 400 }) };
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return { ok: false, res: new Response("bad slug", { status: 400 }) };
  return { ok: true, id: videoId };
}

export async function GET(req: NextRequest) {
  const v = validate(req.nextUrl.searchParams.get("slug"));
  if (!v.ok) return v.res;
  try {
    const upstream = await getUpstreamUrl(v.id);
    return await proxy(req, upstream, v.id, false);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(`resolve failed: ${msg}`, { status: 502 });
  }
}

export async function HEAD(req: NextRequest) {
  const v = validate(req.nextUrl.searchParams.get("slug"));
  if (!v.ok) return v.res;
  try {
    const upstream = await getUpstreamUrl(v.id);
    return await proxy(req, upstream, v.id, true);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(`resolve failed: ${msg}`, { status: 502 });
  }
}
