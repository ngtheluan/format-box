import { marked } from "marked";
import { supabase, supabaseAdmin } from "./supabase";

export type BlogCategory = "tech" | "ai" | "web" | "mobile" | "devops";
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

export const BLOG_CATEGORIES: Record<BlogCategory, string> = {
  tech: "Công nghệ",
  ai: "AI",
  web: "Web",
  mobile: "Mobile",
  devops: "DevOps",
};

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

function extractYouTubeId(s: string): string | null {
  const t = s.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  const m = t.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
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
    return token(
      `<div class="blog-video"><video src="${u}" controls preload="metadata" playsinline></video></div>`,
    );
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
  const { md: prepared, map } = preEmbed(md);
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

export async function listPublicPosts(): Promise<BlogPost[]> {
  const sb = supabase();
  if (!sb) return [];
  const { data } = await sb.from("blog_posts").select("*").order("date", { ascending: false });
  return (data as DbRow[] | null)?.map(fromRow) ?? [];
}

export async function getPublicPost(slug: string): Promise<(BlogPost & { markdown: string }) | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as DbRow;
  return { ...fromRow(row), markdown: row.markdown };
}

// Admin (service role, all statuses)

export async function listAdminPosts(): Promise<BlogPost[]> {
  const sb = supabaseAdmin();
  const { data } = await sb.from("blog_posts").select("*").order("date", { ascending: false });
  return (data as DbRow[] | null)?.map(fromRow) ?? [];
}

export async function getAdminPost(
  slug: string,
): Promise<(BlogPost & { markdown: string }) | null> {
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
