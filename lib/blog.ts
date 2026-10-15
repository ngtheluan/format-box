import { marked } from "marked";
import { supabase, supabaseAdmin } from "./supabase";

export type BlogCategory = string;
export type BlogStatus = "draft" | "rejected" | "published";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  tags: string[];
  author: string;
  date: string;
  readMin: number;
  cover: { from: string; to: string; emoji?: string; label: string };
  coverImage?: string;
  status: BlogStatus;
};

export type BlogCategoryRow = {
  slug: string;
  label: string;
  sort: number;
  active: boolean;
};

export type BlogCategoryMap = Record<string, string>;

// Fallback dùng khi Supabase chưa seed hoặc không tải được.
export const DEFAULT_CATEGORIES: BlogCategoryMap = {
  tech: "Công nghệ",
  ai: "AI",
  web: "Web",
  devops: "DevOps",
  food: "Món ăn",
};

// Giữ tên cũ cho tương thích.
export const BLOG_CATEGORIES: BlogCategoryMap = DEFAULT_CATEGORIES;

type DbCat = { slug: string; label: string; sort: number; active: boolean };

function defaultCatRows(): BlogCategoryRow[] {
  return Object.entries(DEFAULT_CATEGORIES).map(([slug, label], i) => ({ slug, label, sort: (i + 1) * 10, active: true }));
}

export async function listPublicCategories(): Promise<BlogCategoryRow[]> {
  const sb = supabase();
  if (!sb) return defaultCatRows();
  const data = await withRetry(async () => {
    const { data, error } = await sb
      .from("blog_categories")
      .select("slug, label, sort, active")
      .eq("active", true)
      .order("sort", { ascending: true });
    if (error) throw error;
    return data as DbCat[] | null;
  });
  const rows = data ?? [];
  if (!rows.length) return defaultCatRows();
  return rows;
}

export async function listAdminCategories(): Promise<BlogCategoryRow[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("blog_categories")
    .select("slug, label, sort, active")
    .order("sort", { ascending: true });
  const rows = (data as DbCat[] | null) ?? [];
  if (!rows.length) return Object.entries(DEFAULT_CATEGORIES).map(([slug, label], i) => ({ slug, label, sort: (i + 1) * 10, active: true }));
  return rows;
}

export function categoriesToMap(rows: BlogCategoryRow[]): BlogCategoryMap {
  const m: BlogCategoryMap = {};
  for (const r of rows) m[r.slug] = r.label;
  return m;
}

export async function upsertCategory(input: { slug: string; label: string; sort?: number; active?: boolean }): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("blog_categories")
    .upsert(
      {
        slug: input.slug,
        label: input.label,
        sort: input.sort ?? 0,
        active: input.active ?? true,
      },
      { onConflict: "slug" },
    )
    .throwOnError();
}

export async function updateCategory(slug: string, patch: Partial<Omit<BlogCategoryRow, "slug">>): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_categories").update(patch).eq("slug", slug).throwOnError();
}

export async function deleteCategory(slug: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_categories").delete().eq("slug", slug).throwOnError();
}

export async function countPostsInCategory(slug: string): Promise<number> {
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("blog_posts")
    .select("slug", { count: "exact", head: true })
    .eq("category", slug);
  return count ?? 0;
}

// Markdown rendering

export type TocItem = { id: string; text: string };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
export { slugify };

marked.setOptions({ gfm: true, breaks: false });

// Rewrite legacy pollinations URLs → our /api/img proxy (handles 500s with seed retry).
export function rewriteImgUrl(url: string): string {
  const m = url.match(/^https?:\/\/image\.pollinations\.ai\/prompt\/([^?]+)\?(.+)$/);
  if (!m) return url;
  const prompt = decodeURIComponent(m[1]).replace(/[‐-―]/g, "-");
  const qs = new URLSearchParams(m[2]);
  const w = qs.get("width") || "1024";
  const h = qs.get("height") || "576";
  const seed = qs.get("seed") || "1";
  return `/api/img?prompt=${encodeURIComponent(prompt)}&w=${w}&h=${h}&seed=${seed}`;
}

function extractYouTubeId(s: string): string | null {
  const t = s.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  const m = t.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Replace embeds with placeholders BEFORE marked, then swap back AFTER.
// This prevents marked from wrapping block elements inside <p>...</p>.
function preEmbed(md: string): { md: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let i = 0;
  const token = (html: string) => {
    const key = `@@EMBED_${i++}@@`;
    map.set(key, html);
    return `\n\n${key}\n\n`;
  };

  let out = md.replace(/@youtube\[([^\]]+)\]/g, (_m, raw) => {
    const id = extractYouTubeId(raw);
    if (!id) return _m;
    return token(
      `<div class="blog-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div>`,
    );
  });

  out = out.replace(/@video\[([^\]]+)\]/g, (_m, url) => {
    const u = url.trim();
    if (!/^https?:\/\//.test(u)) return _m;
    return token(`<div class="blog-video"><video src="${u}" controls preload="metadata" playsinline></video></div>`);
  });

  out = out.replace(
    /^[ \t]*(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[A-Za-z0-9_?=&-]+|youtu\.be\/[A-Za-z0-9_-]+))[ \t]*$/gim,
    (_m, url) => {
      const id = extractYouTubeId(url);
      if (!id) return _m;
      return token(
        `<div class="blog-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div>`,
      );
    },
  );

  return { md: out, map };
}

export function renderMarkdown(md: string): { html: string; toc: TocItem[] } {
  const rewritten = md.replace(/https?:\/\/image\.pollinations\.ai\/prompt\/[^\s)"']+/g, (u) => rewriteImgUrl(u));
  const { md: prepared, map } = preEmbed(rewritten);
  let raw = marked.parse(prepared) as string;
  map.forEach((html, key) => {
    raw = raw.replace(new RegExp(`<p>\\s*${key}\\s*</p>`, "g"), html).replace(key, html);
  });
  const toc: TocItem[] = [];
  const html = raw.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    let id = slugify(text);
    let n = 2;
    while (toc.some((t) => t.id === id)) id = `${slugify(text)}-${n++}`;
    toc.push({ id, text });
    return `<h2 id="${id}"${attrs ?? ""}>${inner}</h2>`;
  });
  return { html, toc };
}

// DB mapping

type DbRow = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  tags: string[];
  author: string;
  date: string;
  read_min: number;
  cover_from: string;
  cover_to: string;
  cover_label: string;
  cover_image: string | null;
  markdown: string;
  status: BlogStatus;
};

function fromRow(r: DbRow): BlogPost {
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    category: r.category,
    tags: r.tags || [],
    author: r.author,
    date: r.date,
    readMin: r.read_min,
    cover: { from: r.cover_from, to: r.cover_to, label: r.cover_label },
    coverImage: r.cover_image || undefined,
    status: r.status,
  };
}

function toRow(post: BlogPost, markdown: string): DbRow {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    author: post.author,
    date: post.date,
    read_min: post.readMin,
    cover_from: post.cover.from,
    cover_to: post.cover.to,
    cover_label: post.cover.label,
    cover_image: post.coverImage ?? null,
    markdown,
    status: post.status,
  };
}

// Public (anon, RLS filters to published)

async function withRetry<T>(fn: () => Promise<T>, tries = 3, delayMs = 150): Promise<T | null> {
  let lastErr: unknown = null;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  console.error("[blog] query failed after retries:", lastErr);
  return null;
}

export async function listPublicPosts(): Promise<BlogPost[]> {
  const sb = supabase();
  if (!sb) return [];
  const data = await withRetry(async () => {
    const { data, error } = await sb.from("blog_posts").select("*").order("date", { ascending: false });
    if (error) throw error;
    return data as DbRow[] | null;
  });
  return data?.map(fromRow) ?? [];
}

export async function getPublicPost(slug: string): Promise<(BlogPost & { markdown: string }) | null> {
  const sb = supabase();
  if (!sb) return null;
  const data = await withRetry(async () => {
    const { data, error } = await sb.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data as DbRow | null;
  });
  if (!data) return null;
  return { ...fromRow(data), markdown: data.markdown };
}

// Admin (service role, all statuses)

export async function listAdminPosts(): Promise<BlogPost[]> {
  const sb = supabaseAdmin();
  const { data } = await sb.from("blog_posts").select("*").order("date", { ascending: false });
  return (data as DbRow[] | null)?.map(fromRow) ?? [];
}

export async function getAdminPost(slug: string): Promise<(BlogPost & { markdown: string }) | null> {
  const sb = supabaseAdmin();
  const { data } = await sb.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as DbRow;
  return { ...fromRow(row), markdown: row.markdown };
}

export async function insertPost(post: BlogPost, markdown: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_posts").upsert(toRow(post, markdown), { onConflict: "slug" }).throwOnError();
}

export async function updatePost(slug: string, patch: Partial<DbRow>): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_posts").update(patch).eq("slug", slug).throwOnError();
}

export async function updateStatus(slug: string, status: BlogStatus): Promise<void> {
  await updatePost(slug, { status });
}

export async function deletePost(slug: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_posts").delete().eq("slug", slug).throwOnError();
}

export function formatDateVi(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
