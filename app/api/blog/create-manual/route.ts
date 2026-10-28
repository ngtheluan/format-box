import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import {
  getAdminPost,
  insertPost,
  slugify,
  updatePost,
  wordCount,
  type BlogCategory,
  type BlogPost,
} from "@/lib/blog";

export const runtime = "nodejs";

type Body = {
  slug?: string;
  title?: string;
  excerpt?: string;
  category?: BlogCategory;
  tags?: string[];
  readMin?: number;
  coverImage?: string;
  markdown?: string;
  relatedTools?: string[];
};

const DEFAULT_COVER = { from: "#6366f1", to: "#a855f7" };

function uniqueSlug(base: string, exists: (s: string) => Promise<boolean>): Promise<string> {
  async function go(s: string, n: number): Promise<string> {
    const candidate = n === 0 ? s : `${s}-${n}`;
    if (!(await exists(candidate))) return candidate;
    return go(s, n + 1);
  }
  return go(base, 0);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Body;

  const title = (b.title || "").trim();
  const excerpt = (b.excerpt || "").trim();
  const category = (b.category || "").trim();
  const markdown = (b.markdown || "").trim();
  if (!title) return NextResponse.json({ error: "Thiếu tiêu đề" }, { status: 400 });
  if (!category) return NextResponse.json({ error: "Thiếu danh mục" }, { status: 400 });
  if (!markdown) return NextResponse.json({ error: "Thiếu nội dung" }, { status: 400 });

  const baseSlug = slugify(b.slug?.trim() || title).slice(0, 80) || `bai-${Date.now()}`;
  const slug = await uniqueSlug(baseSlug, async (s) => !!(await getAdminPost(s)));

  const tags = Array.isArray(b.tags) ? b.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10) : [];
  const readMin = Number.isFinite(b.readMin) && b.readMin! > 0
    ? Math.min(60, Math.round(b.readMin!))
    : Math.max(3, Math.min(30, Math.round(wordCount(markdown) / 220)));

  const post: BlogPost = {
    slug,
    title,
    excerpt,
    category,
    tags,
    author: "Admin",
    date: new Date().toISOString().slice(0, 10),
    readMin,
    cover: { from: DEFAULT_COVER.from, to: DEFAULT_COVER.to, label: title.split(/\s+/)[0] || "Bài" },
    coverImage: b.coverImage?.trim() || undefined,
    status: "draft",
  };

  const relatedTools = Array.isArray(b.relatedTools)
    ? b.relatedTools.map((h) => String(h).trim()).filter(Boolean).slice(0, 6)
    : [];

  try {
    await insertPost(post, markdown);
    // Saved separately and guarded so a missing related_tools column (before the
    // migration is run) never breaks the core insert.
    if (relatedTools.length) {
      try {
        await updatePost(slug, { related_tools: relatedTools });
      } catch {
        /* column not migrated yet — post is still created */
      }
    }
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    return NextResponse.json({ ok: true, slug, post: { ...post, relatedTools } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "DB lỗi" }, { status: 500 });
  }
}
