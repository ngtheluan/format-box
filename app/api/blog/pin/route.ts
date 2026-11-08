import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { listAdminPosts, MAX_PINNED, updatePost } from "@/lib/blog";

export const runtime = "nodejs";

// Toggle the `pinned` flag on a post. Pinned posts fill the featured split on
// /blog (see MAX_PINNED).
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug, pinned } = (await req.json().catch(() => ({}))) as { slug?: string; pinned?: boolean };
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  try {
    if (pinned) {
      const others = (await listAdminPosts()).filter((p) => p.pinned && p.slug !== slug);
      if (others.length >= MAX_PINNED) {
        return NextResponse.json({ error: `Chỉ được ghim tối đa ${MAX_PINNED} bài` }, { status: 409 });
      }
    }
    await updatePost(slug, { pinned: !!pinned });
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    return NextResponse.json({ ok: true, pinned: !!pinned });
  } catch (e: any) {
    const msg = e?.message || "DB lỗi";
    const hint = /pinned/.test(msg)
      ? ' — chạy supabase/blog.sql trong Supabase SQL editor để thêm cột "pinned".'
      : "";
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }
}
