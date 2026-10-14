import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  getAdminPost,
  getPublishedFromDb,
  readLocalPosts,
  readPostMarkdown,
  updateLocalPost,
  updatePublished,
  writePostMarkdown,
  type BlogCategory,
} from "@/lib/blog";

export const runtime = "nodejs";

type Patch = {
  slug?: string;
  title?: string;
  excerpt?: string;
  category?: BlogCategory;
  tags?: string[];
  readMin?: number;
  markdown?: string;
};

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const patch = (await req.json().catch(() => ({}))) as Patch;
  const slug = patch.slug;
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });

  const post = await getAdminPost(slug);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });

  if (typeof patch.markdown === "string") {
    await writePostMarkdown(slug, patch.markdown);
  }

  // Decide source: local (drafts/rejected) vs DB (published).
  const local = (await readLocalPosts()).find((p) => p.slug === slug);
  if (local) {
    const metaPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) metaPatch.title = patch.title;
    if (patch.excerpt !== undefined) metaPatch.excerpt = patch.excerpt;
    if (patch.category !== undefined) metaPatch.category = patch.category;
    if (patch.tags !== undefined) metaPatch.tags = patch.tags;
    if (patch.readMin !== undefined) metaPatch.readMin = patch.readMin;
    if (Object.keys(metaPatch).length) await updateLocalPost(slug, metaPatch);
  } else if (post.status === "published") {
    // Published in DB. Update DB row.
    const dbPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.excerpt !== undefined) dbPatch.excerpt = patch.excerpt;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.tags !== undefined) dbPatch.tags = patch.tags;
    if (patch.readMin !== undefined) dbPatch.read_min = patch.readMin;
    if (typeof patch.markdown === "string") dbPatch.markdown = patch.markdown;
    if (Object.keys(dbPatch).length) {
      try {
        await updatePublished(slug, dbPatch);
      } catch (e: any) {
        return NextResponse.json({ error: `DB update lỗi: ${e.message}` }, { status: 500 });
      }
    }
  }
  // Seed posts (not local, not DB): markdown-only update written above.

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  const post = await getAdminPost(slug);
  if (!post) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  let markdown = await readPostMarkdown(slug);
  if (!markdown) {
    const db = await getPublishedFromDb(slug);
    markdown = db?.markdown ?? null;
  }
  return NextResponse.json({ post, markdown });
}
