import { NextResponse } from "next/server";
import { listPublicPosts } from "@/lib/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const limit = Math.min(12, Math.max(1, Number(u.searchParams.get("limit") || "3")));
  const posts = (await listPublicPosts()).slice(0, limit).map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    date: p.date,
    readMin: p.readMin,
    coverImage: p.coverImage,
    cover: p.cover,
  }));
  return NextResponse.json(
    { posts },
    {
      headers: {
        // Public list — let Vercel Edge/CDN serve it for 5 minutes, and keep
        // stale copies warm for 10 more while a background refresh runs.
        // Repeat hits never touch Supabase.
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
