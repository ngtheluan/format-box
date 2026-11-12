import { marked } from "marked";
import { revalidateTag, unstable_cache } from "next/cache";
import { supabase, supabaseAdmin } from "./supabase";
import {
  DEFAULT_DYK_CONFIG,
  normDykConfig,
  normStamp,
  stampFromConfig,
  type DykConfig,
  type DykStampDesign,
} from "./dyk-shared";

export type BlogCategory = string;
export type BlogStatus = "draft" | "rejected" | "published";

// Pinned posts fill the featured split on /blog: the first PINNED_IN_CAROUSEL
// rotate in the carousel, the remainder are listed beside it.
export const MAX_PINNED = 6;
export const PINNED_IN_CAROUSEL = 3;

// Admin có 3 cách chọn 6 bài ghim cho /blog:
// - "manual": admin tự tick từng bài (cột `pinned` trên blog_posts)
// - "auto":   hệ thống chọn bài mới + bài có nhiều lượt "hữu ích"
// - "category": 6 bài mới nhất thuộc 1 danh mục
export type BlogPinMode = "manual" | "auto" | "category";
export type BlogPinConfig = { mode: BlogPinMode; category?: string };
export const DEFAULT_PIN_CONFIG: BlogPinConfig = { mode: "manual" };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  tags: string[];
  author: string;
  date: string;
  // Only set when the row was read with `updated_at` (detail queries, not LIST_COLS).
  updatedAt?: string;
  // created_at (timestamptz) — exact publish-order time; `date` has no time of day.
  createdAt?: string;
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

async function fetchPublicCategories(): Promise<BlogCategoryRow[]> {
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

// Categories are read on every public blog page (home, index, detail, tag).
// They change rarely and every mutation calls `revalidateTag("blog-categories")`,
// so cache aggressively.
const listPublicCategoriesCached = unstable_cache(fetchPublicCategories, ["blog:public-categories"], {
  revalidate: 3600,
  tags: ["blog-categories"],
});

export async function listPublicCategories(): Promise<BlogCategoryRow[]> {
  return listPublicCategoriesCached();
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
  revalidateTag("blog-categories");
}

export async function updateCategory(slug: string, patch: Partial<Omit<BlogCategoryRow, "slug">>): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_categories").update(patch).eq("slug", slug).throwOnError();
  revalidateTag("blog-categories");
}

export async function deleteCategory(slug: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_categories").delete().eq("slug", slug).throwOnError();
  revalidateTag("blog-categories");
}

export type DidYouKnowImage = {
  url: string;
  caption_vi: string;
  caption_en: string;
  credit?: string;
  credit_url?: string;
};

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
  quiz?: DidYouKnowQuizQuestion[];
  // Luôn có khi đọc từ DB: tem riêng của hiện vật, hoặc mặc định chung.
  stamp?: DykStampDesign;
  // true khi `stamp` là thiết kế riêng đã lưu (không phải mặc định chung).
  stamp_custom?: boolean;
};

export type DidYouKnowQuizQuestion = {
  q_vi: string;
  q_en: string;
  options_vi: string[];
  options_en: string[];
  answer: number;
  explain_vi: string;
  explain_en: string;
  // "topic" = kiến thức mở rộng, không nằm trong mô tả hiện vật.
  scope?: "exhibit" | "topic";
};

type DbDyk = Omit<DidYouKnowItem, "images" | "quiz" | "stamp" | "stamp_custom"> & {
  images: unknown;
  quiz?: unknown;
  stamp?: unknown;
};

export function normDykQuiz(x: unknown): DidYouKnowQuizQuestion[] {
  // Supabase trả jsonb thành array, nhưng nếu cột bị tạo là text hoặc
  // driver nào đó không parse, ta vẫn đọc được bằng cách tự parse chuỗi.
  if (typeof x === "string") {
    try {
      x = JSON.parse(x);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(x)) return [];
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const out: DidYouKnowQuizQuestion[] = [];
  for (const it of x) {
    if (!it || typeof it !== "object") continue;
    const o = it as any;
    const q_vi = str(o.q_vi);
    const options_vi: string[] = Array.isArray(o.options_vi) ? o.options_vi.map(str) : [];
    const answer = Number(o.answer);
    if (!q_vi || options_vi.length < 2 || !options_vi.every(Boolean)) continue;
    if (!Number.isInteger(answer) || answer < 0 || answer >= options_vi.length) continue;
    const en: string[] = Array.isArray(o.options_en) ? o.options_en.map(str) : [];
    out.push({
      q_vi,
      q_en: str(o.q_en),
      options_vi,
      options_en: options_vi.map((v, i) => en[i] || v),
      answer,
      explain_vi: str(o.explain_vi),
      explain_en: str(o.explain_en),
      ...(o.scope === "topic" || o.scope === "exhibit" ? { scope: o.scope } : {}),
    });
  }
  return out;
}

// credit_url ends up in an href, so only http(s) links survive.
export function dykImageCredit(o: { credit?: unknown; credit_url?: unknown }): Pick<DidYouKnowImage, "credit" | "credit_url"> {
  return {
    ...(typeof o.credit === "string" && o.credit ? { credit: o.credit } : {}),
    ...(typeof o.credit_url === "string" && /^https?:\/\//i.test(o.credit_url) ? { credit_url: o.credit_url } : {}),
  };
}

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
        ...dykImageCredit(o),
      };
    })
    .filter(Boolean) as DidYouKnowImage[];
}

function normDyk(r: DbDyk, cfg: DykConfig): DidYouKnowItem {
  const own = normStamp(r.stamp);
  return {
    ...r,
    images: normDykImages(r.images),
    quiz: normDykQuiz(r.quiz),
    stamp: own ?? stampFromConfig(cfg),
    stamp_custom: !!own,
  };
}

// ---------- Cấu hình chung cho quiz + tem (app_settings) ----------
const DYK_CONFIG_KEY = "blog_dyk_config";

async function fetchDykConfig(): Promise<DykConfig> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("app_settings").select("value").eq("key", DYK_CONFIG_KEY).maybeSingle();
    return normDykConfig(data?.value);
  } catch {
    return { ...DEFAULT_DYK_CONFIG };
  }
}

const getDykConfigCached = unstable_cache(fetchDykConfig, ["blog:dyk-config"], {
  revalidate: 3600,
  tags: ["blog-dyk"],
});

export async function getDykConfig(fresh = false): Promise<DykConfig> {
  return fresh ? fetchDykConfig() : getDykConfigCached();
}

export async function setDykConfig(next: DykConfig): Promise<DykConfig> {
  const clean = normDykConfig(next);
  const sb = supabaseAdmin();
  await sb
    .from("app_settings")
    .upsert({ key: DYK_CONFIG_KEY, value: clean, updated_at: new Date().toISOString() })
    .throwOnError();
  // Hiện vật chưa có tem riêng lấy tem từ đây, nên danh sách công khai cũng phải làm mới.
  revalidateTag("blog-dyk");
  return clean;
}

async function fetchPublicDidYouKnow(): Promise<DidYouKnowItem[]> {
  const sb = supabase();
  if (!sb) return [];
  const data = await withRetry(async () => {
    const { data, error } = await sb
      .from("blog_did_you_know")
      // `*` rather than a column list so a DB without the `quiz` column keeps working.
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true });
    if (error) throw error;
    return data as DbDyk[] | null;
  });
  const cfg = await fetchDykConfig();
  return (data ?? []).map((r) => normDyk(r, cfg));
}

const listPublicDidYouKnowCached = unstable_cache(fetchPublicDidYouKnow, ["blog:public-dyk"], {
  revalidate: 3600,
  tags: ["blog-dyk"],
});

export async function listPublicDidYouKnow(): Promise<DidYouKnowItem[]> {
  return listPublicDidYouKnowCached();
}

export async function listAdminDidYouKnow(): Promise<DidYouKnowItem[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("blog_did_you_know")
    .select("*")
    .order("sort", { ascending: true });
  const cfg = await fetchDykConfig();
  return ((data as DbDyk[] | null) ?? []).map((r) => normDyk(r, cfg));
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
        // Chỉ gửi khi có, để DB chưa migrate cột `stamp` vẫn tạo được hiện vật.
        ...(item.quiz ? { quiz: item.quiz } : {}),
        ...(item.stamp ? { stamp: item.stamp } : {}),
      },
      { onConflict: "slug" },
    )
    .throwOnError();
  revalidateTag("blog-dyk");
}

export type DidYouKnowPatch = Partial<Omit<DidYouKnowItem, "slug" | "stamp" | "stamp_custom">> & {
  // null = bỏ tem riêng, quay về mặc định chung.
  stamp?: DykStampDesign | null;
};

export async function updateDidYouKnow(slug: string, patch: DidYouKnowPatch): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_did_you_know").update(patch).eq("slug", slug).throwOnError();
  revalidateTag("blog-dyk");
}

export async function deleteDidYouKnow(slug: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_did_you_know").delete().eq("slug", slug).throwOnError();
  revalidateTag("blog-dyk");
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
  updated_at?: string;
  created_at?: string;
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
    updatedAt: r.updated_at,
    createdAt: r.created_at,
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

// Columns needed by the list views (everything except the heavy `markdown` body).
// Pulling the whole table was blowing up Supabase egress on every blog list render.
const LIST_COLS =
  "slug,title,excerpt,category,tags,author,date,created_at,read_min,cover_from,cover_to,cover_label,cover_image,status,pinned,related_tools";

async function fetchPublicPostsList(): Promise<BlogPost[]> {
  const sb = supabase();
  if (!sb) return [];
  const data = await withRetry(async () => {
    const { data, error } = await sb
      .from("blog_posts")
      .select(LIST_COLS)
      .eq("status", "published")
      .order("date", { ascending: false });
    if (error) throw error;
    return data as DbRow[] | null;
  });
  return data?.map(fromRow) ?? [];
}

// Public post list changes only when an admin publishes/edits/deletes a post,
// and every mutation calls `revalidateTag("blog-posts")`, so we keep the TTL
// long to avoid hammering the DB between mutations.
const listPublicPostsCachedImpl = unstable_cache(fetchPublicPostsList, ["blog:public-list"], {
  revalidate: 1800,
  tags: ["blog-posts"],
});

export async function listPublicPosts(): Promise<BlogPost[]> {
  return listPublicPostsCachedImpl();
}

export async function listPublicPostsCached(): Promise<BlogPost[]> {
  return listPublicPostsCachedImpl();
}

async function fetchPublicPost(slug: string): Promise<(BlogPost & { markdown: string }) | null> {
  const sb = supabase();
  if (!sb) return null;
  const data = await withRetry(async () => {
    const { data, error } = await sb
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    return data as DbRow | null;
  });
  if (!data) return null;
  return { ...fromRow(data), markdown: data.markdown };
}

// Each public post is ~15-50KB (markdown body dominates), so a longer TTL has
// the largest egress payoff. Admin edits invalidate via `revalidateTag`.
const getPublicPostCachedImpl = unstable_cache(
  fetchPublicPost,
  ["blog:public-post"],
  { revalidate: 1800, tags: ["blog-posts"] },
);

export async function getPublicPost(slug: string): Promise<(BlogPost & { markdown: string }) | null> {
  return getPublicPostCachedImpl(slug);
}

export async function getPublicPostCached(slug: string): Promise<(BlogPost & { markdown: string }) | null> {
  return getPublicPostCachedImpl(slug);
}

// Admin (service role, all statuses)

// Admin list also avoids pulling the heavy `markdown` body — `fromRow()`
// doesn't read it, so SELECT * was throwing ~5KB per post of egress away on
// every admin list fetch (dashboard, /api/blog/series, /api/blog/ideas,
// /api/blog/generate). LIST_COLS keeps the payload small.
export async function listAdminPosts(): Promise<BlogPost[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("blog_posts")
    .select(LIST_COLS)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as unknown as DbRow[] | null)?.map(fromRow) ?? [];
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
  revalidateTag("blog-posts");
}

export async function updatePost(slug: string, patch: Partial<DbRow>): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_posts").update(patch).eq("slug", slug).throwOnError();
  revalidateTag("blog-posts");
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
  revalidateTag("blog-posts");
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

// Series / Chuỗi bài — gộp các bài cùng chủ đề thành một chuỗi có thứ tự. Admin
// gắn 2 tag vào mỗi bài: `series/<slug>` (bắt buộc) và `part/<n>` (số thứ tự);
// không cần migrate DB. Series không có tag `part/<n>` sẽ sort theo ngày đăng.
export type SeriesInfo = { slug: string; order: number; label?: string };
export type SeriesGroup = { slug: string; label: string; parts: BlogPost[] };
export type SeriesContext = SeriesGroup & { index: number; prev: BlogPost | null; next: BlogPost | null };

// Series display name (with diacritics, spaces, case) is persisted per-part as
// `sname/<base64url>` so the admin-typed title survives the slug/tag round-trip.
export function encodeSeriesLabel(label: string): string {
  const b64 = typeof Buffer !== "undefined"
    ? Buffer.from(label, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(label)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeSeriesLabel(encoded: string): string | null {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    if (typeof Buffer !== "undefined") return Buffer.from(padded, "base64").toString("utf8");
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return null;
  }
}

export function parseSeriesFromPost(post: BlogPost): SeriesInfo | null {
  let slug: string | null = null;
  let order = Number.POSITIVE_INFINITY;
  let label: string | undefined;
  for (const raw of post.tags || []) {
    const t = raw.toLowerCase();
    if (t.startsWith("series/")) {
      const v = t.slice("series/".length).trim();
      if (v) slug = v;
    } else if (t.startsWith("part/")) {
      const n = parseInt(t.slice("part/".length), 10);
      if (Number.isFinite(n)) order = n;
    } else if (t.startsWith("sname/")) {
      // Lower-casing the full tag only sits inside this comparison; take the
      // label payload from the ORIGINAL tag so base64 case is preserved.
      const payload = raw.slice("sname/".length).trim();
      const decoded = decodeSeriesLabel(payload);
      if (decoded) label = decoded;
    }
  }
  return slug ? { slug, order, label } : null;
}

function deriveSeriesLabel(slug: string): string {
  // Fallback for legacy series without a stored `sname/<...>` tag: title-case
  // the slug so pages still have something readable.
  return slug.replace(/[-_]+/g, " ").replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export function groupPostsBySeries(posts: BlogPost[]): SeriesGroup[] {
  const buckets = new Map<string, Array<{ post: BlogPost; order: number; label?: string }>>();
  for (const p of posts) {
    const s = parseSeriesFromPost(p);
    if (!s) continue;
    const arr = buckets.get(s.slug) || [];
    arr.push({ post: p, order: s.order, label: s.label });
    buckets.set(s.slug, arr);
  }
  const out: SeriesGroup[] = [];
  for (const [slug, arr] of buckets.entries()) {
    const sorted = arr.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return +new Date(a.post.date) - +new Date(b.post.date);
    });
    const stored = sorted.find((x) => x.label)?.label;
    const parts = sorted.map((x) => x.post);
    out.push({ slug, label: stored || deriveSeriesLabel(slug), parts });
  }
  // Chuỗi có nhiều phần hoặc có bài mới nhất lên trên.
  out.sort((a, b) => {
    if (b.parts.length !== a.parts.length) return b.parts.length - a.parts.length;
    const da = Math.max(...a.parts.map((p) => +new Date(p.date)));
    const db = Math.max(...b.parts.map((p) => +new Date(p.date)));
    return db - da;
  });
  return out;
}

export function getSeriesContext(all: BlogPost[], post: BlogPost): SeriesContext | null {
  const s = parseSeriesFromPost(post);
  if (!s) return null;
  const group = groupPostsBySeries(all).find((g) => g.slug === s.slug);
  if (!group) return null;
  const index = group.parts.findIndex((p) => p.slug === post.slug);
  if (index < 0) return null;
  return {
    ...group,
    index,
    prev: index > 0 ? group.parts[index - 1] : null,
    next: index < group.parts.length - 1 ? group.parts[index + 1] : null,
  };
}

// Helpful-vote count per post slug — feeds the popularity boost in relatedPosts.
async function fetchReactions(): Promise<Record<string, number>> {
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

// Called on every public blog page SSR (index, detail, tag, series). Blog detail
// cannot be statically cached because `blogVoterId()` reads request headers, so
// without this cache the RPC fires on every single visit. Reactions change
// slowly and `castVote` revalidates the tag, so a 5-min TTL is safe.
const listReactionsCached = unstable_cache(fetchReactions, ["blog:reactions"], {
  revalidate: 300,
  tags: ["blog-reactions"],
});

export async function listReactions(): Promise<Record<string, number>> {
  return listReactionsCached();
}

// ---------------------------------------------------------------------------
// Pin config — admin chọn cách ghim 6 bài trên /blog. Lưu trong app_settings
// (key = "blog_pin_config"), đọc bằng service role. Cache 60s + tag để
// revalidate khi admin sửa.
// ---------------------------------------------------------------------------
const PIN_CONFIG_KEY = "blog_pin_config";

function sanitizePinConfig(value: unknown): BlogPinConfig {
  const v = value as Partial<BlogPinConfig> | null | undefined;
  const mode = v?.mode === "auto" || v?.mode === "category" ? v.mode : "manual";
  const category = typeof v?.category === "string" && v.category ? v.category : undefined;
  return mode === "category" ? { mode, category } : { mode };
}

async function fetchPinConfig(): Promise<BlogPinConfig> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("app_settings").select("value").eq("key", PIN_CONFIG_KEY).maybeSingle();
    return sanitizePinConfig(data?.value);
  } catch {
    return { ...DEFAULT_PIN_CONFIG };
  }
}

const getPinConfigCached = unstable_cache(fetchPinConfig, ["blog:pin-config"], {
  revalidate: 300,
  tags: ["blog-pin-config"],
});

export async function getPinConfig(): Promise<BlogPinConfig> {
  return getPinConfigCached();
}

export async function setPinConfig(next: BlogPinConfig): Promise<void> {
  const clean = sanitizePinConfig(next);
  const sb = supabaseAdmin();
  await sb
    .from("app_settings")
    .upsert({ key: PIN_CONFIG_KEY, value: clean, updated_at: new Date().toISOString() })
    .throwOnError();
  revalidateTag("blog-pin-config");
  revalidateTag("blog-posts");
}

// Trả về danh sách bài được ghim (đã sắp xếp) tối đa MAX_PINNED, tính theo
// pin config hiện hành. Dùng chung cho render /blog và preview trong admin.
export function resolvePinnedPosts(
  posts: BlogPost[],
  config: BlogPinConfig,
  popularity?: Record<string, number>,
): BlogPost[] {
  const published = posts.filter((p) => (p.status || "published") === "published");
  if (config.mode === "manual") {
    return published.filter((p) => p.pinned).slice(0, MAX_PINNED);
  }
  if (config.mode === "category") {
    const cat = config.category;
    if (!cat) return [];
    return published
      .filter((p) => p.category === cat)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, MAX_PINNED);
  }
  // auto: bài phát hành mới nhất HOẶC có nhiều lượt "hữu ích". Tối đa một nửa
  // số slot cho bài nhiều "hữu ích" nhất (cần ≥1 lượt), phần còn lại lấy bài
  // mới nhất. Chưa có lượt "hữu ích" nào → cả 6 là bài mới nhất.
  const time = (p: BlogPost) => Date.parse(p.createdAt || p.date) || 0;
  const newest = [...published].sort((a, b) => time(b) - time(a));
  const helpful = (p: BlogPost) => popularity?.[p.slug] ?? 0;
  const mostHelpful = newest
    .filter((p) => helpful(p) > 0)
    .sort((a, b) => helpful(b) - helpful(a) || time(b) - time(a))
    .slice(0, Math.floor(MAX_PINNED / 2));
  const picked = new Set(mostHelpful.map((p) => p.slug));
  const fill = newest.filter((p) => !picked.has(p.slug)).slice(0, MAX_PINNED - mostHelpful.length);
  // Hiển thị mới nhất trước.
  return [...mostHelpful, ...fill].sort((a, b) => time(b) - time(a));
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
  revalidateTag("blog-reactions");
  return normalizeVotes(data);
}
