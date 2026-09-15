import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/podcasts/truyenmabelai?slug=<videoId>
// Returns a same-origin proxy URL. The proxy hides the IP-bound googlevideo URL
// from the browser (which would otherwise 403 on cross-IP requests) and forwards
// Range requests so <audio> can seek.
export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("slug");
  if (!videoId) return NextResponse.json({ error: "missing slug" }, { status: 400 });

  return NextResponse.json({
    audioUrl: `/api/podcasts/truyenmabelai/stream?slug=${encodeURIComponent(videoId)}`,
  });
}
