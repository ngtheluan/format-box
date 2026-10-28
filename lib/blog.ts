import { marked } from "marked";
import { unstable_noStore as noStore } from "next/cache";
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
  pinned?: boolean;
  // Tool hrefs shown in the "Công cụ liên quan" block. Empty/undefined → the
  // reader page falls back to auto-matching via relatedTools().
  relatedTools?: string[];
};

export type BlogCategoryRow = {
  slug: string;
  label: string;
  sort: number;
  active: boolean;
};

export type BlogCategoryMap = Record<string, string>;

export function slugifyLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  noStore();
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

export type DidYouKnowImage = { url: string; caption_vi: string; caption_en: string };

export type DidYouKnowItem = {
  slug: string;
  tag_vi: string;
  tag_en: string;
  title_vi: string;
  title_en: string;
  intro_vi: string;
  intro_en: string;
  images: DidYouKnowImage[];
  sort: number;
  active: boolean;
};

type DbDyk = Omit<DidYouKnowItem, "images"> & { images: unknown };

function normDykImages(x: unknown): DidYouKnowImage[] {
  if (!Array.isArray(x)) return [];
  return x
    .map((it) => {
      if (!it || typeof it !== "object") return null;
      const o = it as any;
      const url = typeof o.url === "string" ? o.url : "";
      if (!url) return null;
      return {
        url,
        caption_vi: typeof o.caption_vi === "string" ? o.caption_vi : "",
        caption_en: typeof o.caption_en === "string" ? o.caption_en : "",
      };
    })
    .filter(Boolean) as DidYouKnowImage[];
}

function normDyk(r: DbDyk): DidYouKnowItem {
  return { ...r, images: normDykImages(r.images) };
}

export async function listPublicDidYouKnow(): Promise<DidYouKnowItem[]> {
  noStore();
  const sb = supabase();
  if (!sb) return [];
  const data = await withRetry(async () => {
    const { data, error } = await sb
      .from("blog_did_you_know")
      .select("slug, tag_vi, tag_en, title_vi, title_en, intro_vi, intro_en, images, sort, active")
      .eq("active", true)
      .order("sort", { ascending: true });
    if (error) throw error;
    return data as DbDyk[] | null;
  });
  return (data ?? []).map(normDyk);
}

export async function listAdminDidYouKnow(): Promise<DidYouKnowItem[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("blog_did_you_know")
    .select("slug, tag_vi, tag_en, title_vi, title_en, intro_vi, intro_en, images, sort, active")
    .order("sort", { ascending: true });
  return ((data as DbDyk[] | null) ?? []).map(normDyk);
}

export async function upsertDidYouKnow(item: DidYouKnowItem): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("blog_did_you_know")
    .upsert(
      {
        slug: item.slug,
        tag_vi: item.tag_vi,
        tag_en: item.tag_en,
        title_vi: item.title_vi,
        title_en: item.title_en,
        intro_vi: item.intro_vi,
        intro_en: item.intro_en,
        images: item.images,
        sort: item.sort,
        active: item.active,
      },
      { onConflict: "slug" },
    )
    .throwOnError();
}

export async function updateDidYouKnow(slug: string, patch: Partial<Omit<DidYouKnowItem, "slug">>): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_did_you_know").update(patch).eq("slug", slug).throwOnError();
}

export async function deleteDidYouKnow(slug: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_did_you_know").delete().eq("slug", slug).throwOnError();
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

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
function decodeHtmlEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return HTML_ENTITIES[body.toLowerCase()] ?? m;
  });
}

marked.setOptions({ gfm: true, breaks: false });

// Rewrite legacy pollinations URLs → our /api/img proxy (handles 500s with seed retry).
export function rewriteImgUrl(url: string): string {
  // AI-generated Markdown may escape URL punctuation (for example
  // `https\://...Rice\_...`). Those backslashes are valid Markdown escapes,
  // but must not be sent to the image host as part of the URL.
  url = url.replace(/\\/g, "");
  // `thumb.wikimedia.org` is a retired thumbnail host. Older saved posts may
  // still contain it, while Commons serves the same path from upload.wikimedia.org.
  url = url.replace(/^https?:\/\/thumb\.wikimedia\.org(?=\/)/i, "https://upload.wikimedia.org");
  const m = url.match(/^https?:\/\/image\.pollinations\.ai\/prompt\/([^?]+)\?(.+)$/);
  if (!m) return url;
  const prompt = decodeURIComponent(m[1]).replace(/[‐-―]/g, "-");
  const qs = new URLSearchParams(m[2]);
  const w = qs.get("width") || "1024";
  const h = qs.get("height") || "576";
  const seed = qs.get("seed") || "1";
  return `/api/img?prompt=${encodeURIComponent(prompt)}&w=${w}&h=${h}&seed=${seed}`;
}

// Cover image may carry photo credit in its URL fragment: `<url>#credit=<json>`.
// Fragments never reach the image host, so the stored value stays a valid image URL.
export type CoverCredit = { name: string; url: string; source: string };

export function withCoverCredit(url: string, credit?: CoverCredit | null): string {
  const base = url.split("#")[0];
  return credit ? `${base}#credit=${encodeURIComponent(JSON.stringify(credit))}` : base;
}

export function parseCoverImage(raw?: string | null): { src: string; credit: CoverCredit | null } | null {
  if (!raw) return null;
  const [src, frag] = raw.split("#");
  let credit: CoverCredit | null = null;
  const m = frag?.match(/^credit=(.+)$/);
  if (m) {
    try {
      credit = JSON.parse(decodeURIComponent(m[1]));
    } catch {}
  }
  return { src: rewriteImgUrl(src), credit };
}

// Resize Unsplash URLs (imgix params) for smaller placements such as cards.
export function sizedImg(url: string, w: number, h: number): string {
  if (!/images\.unsplash\.com/.test(url)) return url;
  const u = url.replace(/([?&])w=\d+/, `$1w=${w}`).replace(/([?&])h=\d+/, `$1h=${h}`);
  return /[?&]w=/.test(u) ? u : `${u}&w=${w}&h=${h}&fit=crop`;
}

export function wordCount(md: string): number {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_`|\-\[\]()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
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
  const rewritten = md.replace(/https?\\?:\/\/[^\s)"']+/g, (u) => rewriteImgUrl(u));
  const { md: prepared, map } = preEmbed(rewritten);
  let raw = marked.parse(prepared) as string;
  map.forEach((html, key) => {
    raw = raw.replace(new RegExp(`<p>\\s*${key}\\s*</p>`, "g"), html).replace(key, html);
  });
  const toc: TocItem[] = [];
  const html = raw.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, attrs, inner) => {
    const text = decodeHtmlEntities(inner.replace(/<[^>]+>/g, "")).trim();
    let id = slugify(text);
    let n = 2;
    while (toc.some((t) => t.id === id)) id = `${slugify(text)}-${n++}`;
    toc.push({ id, text });
    return `<h2 id="${id}"${attrs ?? ""}>${inner}</h2>`;
  });
  const withImgPolicy = html.replace(/<img\b(?![^>]*\breferrerpolicy=)([^>]*)>/gi, '<img referrerpolicy="no-referrer"$1>');
  return { html: withImgPolicy.replace(/<table>([\s\S]*?)<\/table>/g, '<div class="bd-table"><table>$1</table></div>'), toc };
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
  // `pinned` is only present when the column exists in the DB (see supabase/blog.sql).
  // Treat it as optional when reading so unmigrated environments keep working.
  pinned?: boolean;
  // `related_tools` (jsonb) is optional for the same reason — run the ALTER in
  // supabase/schema.sql to add the column.
  related_tools?: string[] | null;
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
    pinned: !!r.pinned,
    relatedTools: Array.isArray(r.related_tools) ? r.related_tools : undefined,
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
    // `pinned` is omitted on insert so the row stays compatible with legacy schemas
    // that haven't run the migration in supabase/blog.sql yet. Pinning is applied
    // afterward via /api/blog/pin, which surfaces a clear error if the column is
    // missing.
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
  noStore();
  return listPublicPostsCached();
}

export async function listPublicPostsCached(): Promise<BlogPost[]> {
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
  noStore();
  return getPublicPostCached(slug);
}

export async function getPublicPostCached(slug: string): Promise<(BlogPost & { markdown: string }) | null> {
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
  // Deleting a post also discards its votes (no orphan rows). Setting a post to
  // draft keeps them, so updateStatus is intentionally left untouched.
  await sb.from("blog_votes").delete().eq("slug", slug).throwOnError();
}

export function formatDateVi(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Pick the posts most relevant to `post`. Relevance combines several signals:
//   • same category                → +3 (strongest)
//   • each shared tag              → +2
//   • recency (within ~180 days)   → up to +1
//   • reader votes ("hữu ích")     → up to +1.5 popularity boost
// The vote boost is what makes related "smarter from votes": among posts of
// similar topical relevance, the ones readers marked helpful surface first.
// `popularity` maps slug → helpful-vote count (optional; omit to skip it).
export function relatedPosts(
  all: BlogPost[],
  post: BlogPost,
  limit = 3,
  popularity?: Record<string, number>,
): BlogPost[] {
  const myTags = new Set(post.tags.map((t) => t.toLowerCase()));
  const now = Date.now();
  const scored = all
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      let score = 0;
      if (p.category === post.category) score += 3;
      for (const tg of p.tags) if (myTags.has(tg.toLowerCase())) score += 2;
      // Recency nudge: up to ~1 point for posts within the last ~180 days.
      const ageDays = (now - new Date(p.date).getTime()) / 86_400_000;
      if (Number.isFinite(ageDays)) score += Math.max(0, 1 - ageDays / 180);
      // Popularity nudge: helpful votes, saturating so a viral post can't swamp
      // topical relevance (10+ helpful votes ≈ full +1.5).
      const helpful = popularity?.[p.slug] ?? 0;
      if (helpful > 0) score += Math.min(1.5, helpful * 0.15);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || +new Date(b.p.date) - +new Date(a.p.date));
  return scored.slice(0, limit).map((s) => s.p);
}

// Helpful-vote count per post slug — feeds the popularity boost in relatedPosts.
export async function listReactions(): Promise<Record<string, number>> {
  const sb = supabase();
  if (!sb) return {};
  const data = await withRetry(async () => {
    const { data, error } = await sb.rpc("blog_votes_helpful_counts");
    if (error) throw error;
    return data as { slug: string; helpful: number }[] | null;
  });
  const map: Record<string, number> = {};
  for (const r of data ?? []) map[r.slug] = r.helpful ?? 0;
  return map;
}

// Blog votes — "bài viết có hữu ích không". One vote per reader (user id or IP),
// stored in `blog_votes`. `mine` is the caller's current choice (or null). All
// access goes through security-definer RPCs; see supabase/schema.sql.
export type ReactionKind = "helpful" | "unhelpful";
export type BlogVotes = { helpful: number; unhelpful: number; mine: ReactionKind | null };

const EMPTY_VOTES: BlogVotes = { helpful: 0, unhelpful: 0, mine: null };

function normalizeVotes(data: unknown): BlogVotes {
  const row = (Array.isArray(data) ? data[0] : data) as
    | { helpful?: number; unhelpful?: number; mine?: string | null }
    | null;
  const mine = row?.mine === "helpful" || row?.mine === "unhelpful" ? row.mine : null;
  return { helpful: row?.helpful ?? 0, unhelpful: row?.unhelpful ?? 0, mine };
}

export async function getVotes(slug: string, voter: string): Promise<BlogVotes> {
  const sb = supabase();
  if (!sb) return { ...EMPTY_VOTES };
  const data = await withRetry(async () => {
    const { data, error } = await sb.rpc("blog_votes_get", { p_slug: slug, p_voter: voter });
    if (error) throw error;
    return data;
  });
  return normalizeVotes(data);
}

export async function castVote(slug: string, voter: string, kind: ReactionKind): Promise<BlogVotes> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.rpc("blog_vote", { p_slug: slug, p_voter: voter, p_kind: kind });
  if (error) throw error;
  return normalizeVotes(data);
}
