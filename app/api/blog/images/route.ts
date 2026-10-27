import { isSuperAdmin } from "@/lib/admin-auth";
import { searchOpenverse, searchPexels, searchUnsplash, searchWikimedia, trackImageUse } from "@/lib/blog-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?q=&page=&source=unsplash|openverse → candidates for the admin image picker.
export async function GET(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim().slice(0, 120);
  const page = Math.max(1, Number(u.searchParams.get("page") || "1"));
  const srcParam = u.searchParams.get("source") || "unsplash";
  const source = (["unsplash", "openverse", "pexels", "wikimedia"].includes(srcParam) ? srcParam : "unsplash") as
    | "unsplash"
    | "openverse"
    | "pexels"
    | "wikimedia";
  if (!q) return NextResponse.json({ images: [] });
  const fn = {
    unsplash: searchUnsplash,
    openverse: searchOpenverse,
    pexels: searchPexels,
    wikimedia: searchWikimedia,
  }[source];
  const images = await fn(q, 18, page);
  return NextResponse.json({ images });
}

// POST { downloadLocation } → Unsplash download tracking when admin picks a photo.
export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { downloadLocation?: string };
  const loc = body.downloadLocation || "";
  if (/^https:\/\/api\.unsplash\.com\//.test(loc)) await trackImageUse({ source: "unsplash", downloadLocation: loc });
  return NextResponse.json({ ok: true });
}
