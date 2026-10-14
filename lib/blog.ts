import fs from "node:fs/promises";
import path from "node:path";
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
  date: string; // ISO yyyy-mm-dd
  readMin: number;
  cover: { from: string; to: string; emoji?: string; label: string };
  coverImage?: string;
  status?: BlogStatus; // populated at list time; stored differently per source
};

export const BLOG_CATEGORIES: Record<BlogCategory, string> = {
  tech: "Công nghệ",
  ai: "AI",
  web: "Web",
  mobile: "Mobile",
  devops: "DevOps",
};

// Seed posts — treated as always-published, source of truth is the .md file.
export const SEED_POSTS: BlogPost[] = [
  {
    slug: "ai-trong-cuoc-song-hang-ngay-2026",
    title: "AI trong cuộc sống hằng ngày 2026: Những ứng dụng không thể bỏ qua",
    excerpt:
      "Từ trợ lý ảo biết lên lịch tới các mô hình đa phương thức đang thay đổi cách chúng ta làm việc, học tập và giải trí.",
    category: "ai",
    tags: ["AI", "ChatGPT", "Trợ lý ảo", "Năng suất"],
    author: "FormatBox",
    date: "2026-10-10",
    readMin: 8,
    cover: { from: "#7565f6", to: "#22c5e8", label: "AI 2026" },
  },
  {
    slug: "nextjs-14-app-router-cho-nguoi-moi",
    title: "Next.js 14 App Router cho người mới: Hiểu đúng từ đầu",
    excerpt:
      "App Router thay đổi cách Next.js xử lý routing, server components và data fetching.",
    category: "web",
    tags: ["Next.js", "React", "App Router", "Server Components"],
    author: "FormatBox",
    date: "2026-10-05",
    readMin: 12,
    cover: { from: "#0ea5e9", to: "#8b5cf6", label: "Next.js" },
  },
  {
    slug: "bao-mat-mat-khau-2026-passkey-la-tuong-lai",
    title: "Bảo mật mật khẩu 2026: Passkey đang thay thế password như thế nào?",
    excerpt:
      "Passkey, WebAuthn, biometrics — các chuẩn mới giúp đăng nhập an toàn, nhanh hơn và không còn bị phishing.",
    category: "tech",
    tags: ["Bảo mật", "Passkey", "WebAuthn", "FIDO2"],
    author: "FormatBox",
    date: "2026-09-28",
    readMin: 10,
    cover: { from: "#ec4899", to: "#f59e0b", label: "Passkey" },
  },
  {
    slug: "tangentials-devops-cicd-github-actions",
    title: "Thiết lập CI/CD với GitHub Actions trong 15 phút",
    excerpt:
      "Pipeline tự động chạy test, build, deploy mỗi khi push. Hướng dẫn từng bước kèm file workflow mẫu.",
    category: "devops",
    tags: ["CI/CD", "GitHub Actions", "DevOps", "Automation"],
    author: "FormatBox",
    date: "2026-09-20",
    readMin: 9,
    cover: { from: "#10b981", to: "#06b6d4", label: "CI/CD" },
  },
];

// ------------- File-based store (drafts/rejected) -------------

const POSTS_JSON = path.join(process.cwd(), "data", "blog-posts.json");

type StoredPost = BlogPost & { status: Exclude<BlogStatus, "published"> | "published" };

async function readLocal(): Promise<StoredPost[]> {
  try {
    const raw = await fs.readFile(POSTS_JSON, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeLocal(posts: StoredPost[]) {
  await fs.mkdir(path.dirname(POSTS_JSON), { recursive: true });
  await fs.writeFile(POSTS_JSON, JSON.stringify(posts, null, 2), "utf8");
}

export async function appendLocalPost(post: BlogPost, status: BlogStatus = "draft") {
  const current = await readLocal();
  const next = [{ ...post, status }, ...current.filter((p) => p.slug !== post.slug)];
  await writeLocal(next);
}

export async function updateLocalStatus(slug: string, status: BlogStatus) {
  const current = await readLocal();
  await writeLocal(current.map((p) => (p.slug === slug ? { ...p, status } : p)));
}

export async function removeLocalPost(slug: string) {
  const current = await readLocal();
  await writeLocal(current.filter((p) => p.slug !== slug));
  try {
    await fs.unlink(path.join(process.cwd(), "content", "blog", `${slug}.md`));
  } catch {}
}

export async function updateLocalPost(slug: string, patch: Partial<BlogPost>) {
  const current = await readLocal();
  await writeLocal(current.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));
}

// ------------- Markdown source -------------

export async function readPostMarkdown(slug: string): Promise<string | null> {
  const file = path.join(process.cwd(), "content", "blog", `${slug}.md`);
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

export async function writePostMarkdown(slug: string, md: string) {
  const dir = path.join(process.cwd(), "content", "blog");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${slug}.md`), md, "utf8");
}

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

export function renderMarkdown(md: string): { html: string; toc: TocItem[] } {
  const raw = marked.parse(md) as string;
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

// ------------- Supabase store (published) -------------

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
    status: "published",
  };
}

export async function listPublishedFromDb(): Promise<BlogPost[]> {
  const sb = supabase();
  if (!sb) return [];
  try {
    const { data } = await sb.from("blog_posts").select("*").order("date", { ascending: false });
    return (data as DbRow[] | null)?.map(fromRow) ?? [];
  } catch {
    return [];
  }
}

export async function getPublishedFromDb(slug: string): Promise<(BlogPost & { markdown: string }) | null> {
  const sb = supabase();
  if (!sb) return null;
  try {
    const { data } = await sb.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
    if (!data) return null;
    const row = data as DbRow;
    return { ...fromRow(row), markdown: row.markdown };
  } catch {
    return null;
  }
}

export async function insertPublished(post: BlogPost, markdown: string): Promise<void> {
  const sb = supabaseAdmin();
  const row: DbRow = {
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
  };
  await sb.from("blog_posts").upsert(row, { onConflict: "slug" }).throwOnError();
}

export async function updatePublished(slug: string, patch: Partial<DbRow>): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_posts").update(patch).eq("slug", slug).throwOnError();
}

export async function deletePublished(slug: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("blog_posts").delete().eq("slug", slug).throwOnError();
}

// ------------- Public listings -------------

export async function listPublicPosts(): Promise<BlogPost[]> {
  const db = await listPublishedFromDb();
  const bySlug = new Map<string, BlogPost>();
  for (const p of db) bySlug.set(p.slug, p);
  for (const p of SEED_POSTS) if (!bySlug.has(p.slug)) bySlug.set(p.slug, { ...p, status: "published" });
  return [...bySlug.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPublicPost(slug: string): Promise<BlogPost | null> {
  const db = await getPublishedFromDb(slug);
  if (db) return db;
  const seed = SEED_POSTS.find((p) => p.slug === slug);
  return seed ? { ...seed, status: "published" } : null;
}

// Admin listing: everything the admin can see — published (DB), seed, drafts, rejected.
export async function listAdminPosts(): Promise<BlogPost[]> {
  const [db, local] = await Promise.all([listPublishedFromDb(), readLocal()]);
  const bySlug = new Map<string, BlogPost>();
  for (const p of db) bySlug.set(p.slug, p);
  for (const p of SEED_POSTS) if (!bySlug.has(p.slug)) bySlug.set(p.slug, { ...p, status: "published" });
  for (const p of local) bySlug.set(p.slug, p);
  return [...bySlug.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getAdminPost(slug: string): Promise<BlogPost | null> {
  const local = (await readLocal()).find((p) => p.slug === slug);
  if (local) return local;
  return getPublicPost(slug);
}

export async function readLocalPosts(): Promise<StoredPost[]> {
  return readLocal();
}

export function formatDateVi(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
