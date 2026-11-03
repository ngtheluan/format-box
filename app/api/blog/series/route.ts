import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import {
  encodeSeriesLabel,
  groupPostsBySeries,
  listAdminPosts,
  parseSeriesFromPost,
  updatePost,
  type BlogPost,
} from "@/lib/blog";

export const runtime = "nodejs";

// Series are stored as two tag conventions on each post:
//   • `series/<slug>` — which series the post belongs to
//   • `part/<n>`     — its order within the series (1-based)
// Admin edits happen via one PUT per series — the server rewrites the tags on
// every affected post so the admin never has to touch tags by hand.

function stripSeriesTags(tags: string[]): string[] {
  return (tags || []).filter((t) => {
    const l = t.toLowerCase();
    return !l.startsWith("series/") && !l.startsWith("part/") && !l.startsWith("sname/");
  });
}

function withSeriesTags(tags: string[], slug: string, order: number, label?: string): string[] {
  const base = [...stripSeriesTags(tags), `series/${slug}`, `part/${order}`];
  if (label && label.trim()) base.push(`sname/${encodeSeriesLabel(label.trim())}`);
  return base;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const posts = await listAdminPosts();
  const groups = groupPostsBySeries(posts).map((g) => ({
    slug: g.slug,
    label: g.label,
    parts: g.parts.map((p, i) => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      status: p.status,
      category: p.category,
      coverImage: p.coverImage ?? null,
      order: i + 1,
    })),
  }));
  return NextResponse.json({ groups });
}

type PutBody = { slug?: string; label?: string; previousSlug?: string | null; slugs?: string[] };

export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as PutBody;
  const slug = String(body.slug || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return NextResponse.json({ error: "Thiếu slug series" }, { status: 400 });
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const incoming = Array.isArray(body.slugs) ? body.slugs.filter((s) => typeof s === "string") : [];
  const previousSlug = body.previousSlug ? String(body.previousSlug) : null;

  const all = await listAdminPosts();
  const bySlug = new Map(all.map((p) => [p.slug, p] as const));
  for (const s of incoming) {
    if (!bySlug.has(s)) {
      return NextResponse.json({ error: `Không tìm thấy bài: ${s}` }, { status: 400 });
    }
  }

  // Which posts currently belong to this series (or the previous slug when
  // renaming) and must have their series tags cleared when they drop out?
  const existingSlugs = new Set<string>();
  for (const p of all) {
    const s = parseSeriesFromPost(p);
    if (!s) continue;
    if (s.slug === slug || (previousSlug && s.slug === previousSlug)) existingSlugs.add(p.slug);
  }
  const incomingSet = new Set(incoming);
  const toClear: BlogPost[] = [];
  for (const s of existingSlugs) {
    if (!incomingSet.has(s)) {
      const p = bySlug.get(s);
      if (p) toClear.push(p);
    }
  }

  const touched: string[] = [];
  try {
    for (const p of toClear) {
      await updatePost(p.slug, { tags: stripSeriesTags(p.tags) });
      touched.push(p.slug);
    }
    for (let i = 0; i < incoming.length; i++) {
      const postSlug = incoming[i];
      const p = bySlug.get(postSlug)!;
      await updatePost(postSlug, { tags: withSeriesTags(p.tags, slug, i + 1, label) });
      touched.push(postSlug);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/series/${slug}`);
  if (previousSlug && previousSlug !== slug) revalidatePath(`/blog/series/${previousSlug}`);
  for (const s of touched) revalidatePath(`/blog/${s}`);

  return NextResponse.json({
    ok: true,
    slug,
    count: incoming.length,
    snameTag: label ? `sname/${encodeSeriesLabel(label)}` : null,
  });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const slug = String(url.searchParams.get("slug") || "").toLowerCase();
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  const all = await listAdminPosts();
  const members = all.filter((p) => parseSeriesFromPost(p)?.slug === slug);
  try {
    for (const p of members) {
      await updatePost(p.slug, { tags: stripSeriesTags(p.tags) });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
  revalidatePath("/blog");
  revalidatePath(`/blog/series/${slug}`);
  for (const p of members) revalidatePath(`/blog/${p.slug}`);
  return NextResponse.json({ ok: true, cleared: members.length });
}
