import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET /api/podcasts/truyenmabelai?slug=<videoId>
// Returns { audioUrl } exactly like /api/podcasts/machuteam does — the URL is a
// direct progressive mp4 from googlevideo (format 18: 360p H.264 + AAC in one
// byte-seekable file). iOS Safari plays this in <video playsinline> fine, and
// the browser fetches it straight from googlevideo so we skip proxying and
// avoid the ~20-30s header timeout that killed the old transcoded path.

const YTDLP_FORMAT = "18/best[protocol^=http][ext=mp4][acodec!=none][vcodec!=none]";

type CacheEntry = { url: string; expiresAt: number };
const urlCache = new Map<string, CacheEntry>();

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
        const lines = stdout.trim().split("\n").filter(Boolean);
        if (lines.length !== 1) {
          return reject(new Error(`expected 1 progressive URL, got ${lines.length}`));
        }
        return resolve(lines[0]);
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

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("slug");
  if (!videoId) return NextResponse.json({ error: "missing slug" }, { status: 400 });
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "bad slug" }, { status: 400 });
  }

  try {
    const audioUrl = await getUpstreamUrl(videoId);
    return NextResponse.json({ audioUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: `resolve failed: ${msg}` }, { status: 502 });
  }
}
