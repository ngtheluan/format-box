import { NextResponse } from "next/server";
import {
  categoriesToMap,
  groupPostsBySeries,
  listPublicCategories,
  listPublicDidYouKnow,
  listPublicPosts,
} from "@/lib/blog";

export const runtime = "nodejs";

// Public nav + search payload used by the top-bar menu and search palette on
// /blog. Trimmed to the minimum each client needs: titles/tags for scoring,
// slugs for navigation. The full post body never leaves Supabase.
export async function GET() {
  const [posts, catRows, dyk] = await Promise.all([
    listPublicPosts(),
    listPublicCategories(),
    listPublicDidYouKnow(),
  ]);
  const categories = catRows.map((r) => ({ slug: r.slug, label: r.label }));
  const series = groupPostsBySeries(posts).map((g) => ({
    slug: g.slug,
    label: g.label,
    count: g.parts.length,
    category: g.parts[0]?.category ?? "",
  }));
  const catMap = categoriesToMap(catRows);
  const postsLite = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    categoryLabel: catMap[p.category] || p.category,
    tags: p.tags.filter((t) => !/^(series|part|sname)\//i.test(t)),
    date: p.date,
    readMin: p.readMin,
  }));
  const didYouKnow = dyk.map((it) => ({
    slug: it.slug,
    tag_vi: it.tag_vi,
    tag_en: it.tag_en,
    title_vi: it.title_vi,
    title_en: it.title_en,
  }));
  return NextResponse.json(
    { categories, series, didYouKnow, posts: postsLite },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    },
  );
}
