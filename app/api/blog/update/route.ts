import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { getAdminPost, updatePost, type BlogCategory } from "@/lib/blog";

export const runtime = "nodejs";

type Patch = {
  slug?: string;
  title?: string;
  excerpt?: string;
  category?: BlogCategory;
  tags?: string[];
  readMin?: number;
  markdown?: string;
  coverImage?: string | null;
  pinned?: boolean;
};

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const patch = (await req.json().catch(() => ({}))) as Patch;
  const slug = patch.slug;
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });

  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.excerpt !== undefined) dbPatch.excerpt = patch.excerpt;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.tags !== undefined) dbPatch.tags = patch.tags;
  if (patch.readMin !== undefined) dbPatch.read_min = patch.readMin;
  if (patch.markdown !== undefined) dbPatch.markdown = patch.markdown;
  if (patch.coverImage !== undefined) dbPatch.cover_image = patch.coverImage || null;
  if (patch.pinned !== undefined) dbPatch.pinned = !!patch.pinned;

  if (!Object.keys(dbPatch).length) return NextResponse.json({ ok: true });

  const current = await getAdminPost(slug);
  if (!current) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (current.status === "published") {
    return NextResponse.json(
      { error: "Bài đã phát hành — chuyển về Nháp trước khi sửa" },
      { status: 409 },
    );
  }

  try {
    await updatePost(slug, dbPatch);
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  const post = await getAdminPost(slug);
  if (!post) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ post, markdown: post.markdown });
}
