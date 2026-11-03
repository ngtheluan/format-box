import { isSuperAdmin } from "@/lib/admin-auth";
import { searchYouTubeVideos } from "@/lib/blog-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = ((await req.json().catch(() => null)) || {}) as { query?: string; limit?: number };
  const query = (body.query || "").toString().trim().slice(0, 200);
  if (!query) return NextResponse.json({ videos: [] });
  const limit = Math.max(1, Math.min(24, Number(body.limit) || 12));
  const videos = await searchYouTubeVideos(query, limit, { timeoutMs: 12_000 });
  return NextResponse.json({ videos });
}
