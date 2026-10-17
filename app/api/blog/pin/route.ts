import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { updatePost } from "@/lib/blog";

export const runtime = "nodejs";

// Toggle the `pinned` flag on a post. Pinned posts show as the featured hero on
// /blog; multiple pinned posts rotate in a slider.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug, pinned } = (await req.json().catch(() => ({}))) as { slug?: string; pinned?: boolean };
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  try {
    await updatePost(slug, { pinned: !!pinned });
    return NextResponse.json({ ok: true, pinned: !!pinned });
  } catch (e: any) {
    const msg = e?.message || "DB lỗi";
    const hint = /pinned/.test(msg)
      ? ' — chạy supabase/blog.sql trong Supabase SQL editor để thêm cột "pinned".'
      : "";
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }
}
