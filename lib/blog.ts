import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export type BlogCategory = {
  slug: string;
  label: string;
  description: string;
};

export const BLOG_CATEGORIES: BlogCategory[] = [
  { slug: "web", label: "Web & Frontend", description: "Framework, trình duyệt, UI." },
  { slug: "backend", label: "Backend & Database", description: "API, DB, hạ tầng server." },
  { slug: "ai", label: "AI & LLM", description: "Mô hình, agent, workflow." },
  { slug: "devops", label: "DevOps & Cloud", description: "Edge, serverless, CI/CD." },
];

export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  excerpt: string;
  cover?: string;
  readingMinutes: number;
  publishedAt: string;
  author: string;
  body: string;
};

const CONTENT_DIR = join(process.cwd(), "content", "blog");

function parseFrontmatter(src: string): { data: Record<string, unknown>; body: string } {
  const match = src.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: src };
  const [, head, body] = match;
  const data: Record<string, unknown> = {};
  for (const raw of head.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value: string = line.slice(i + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      data[key] = value.slice(1, -1);
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      data[key] = Number(value);
    } else {
      data[key] = value;
    }
  }
  return { data, body };
}

async function readOne(file: string): Promise<BlogPost | null> {
  const src = await readFile(join(CONTENT_DIR, file), "utf8");
  const { data, body } = parseFrontmatter(src);
  const slug = typeof data.slug === "string" ? data.slug : file.replace(/\.md$/, "");
  if (!data.title) return null;
  return {
    slug,
    title: String(data.title),
    category: String(data.category ?? "web"),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    excerpt: String(data.excerpt ?? ""),
    cover: data.cover ? String(data.cover) : undefined,
    readingMinutes: typeof data.readingMinutes === "number" ? data.readingMinutes : 5,
    publishedAt: String(data.publishedAt ?? ""),
    author: String(data.author ?? "FormatBox"),
    body: body.trim(),
  };
}

let cache: BlogPost[] | null = null;

export async function getAllPosts(): Promise<BlogPost[]> {
  if (cache) return cache;
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith(".md"));
  const posts = (await Promise.all(files.map(readOne))).filter((p): p is BlogPost => !!p);
  posts.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  cache = posts;
  return posts;
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  const posts = await getAllPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.category === category);
}

export function categoryLabel(slug: string): string {
  return BLOG_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
