import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  getAdminPost,
  insertPublished,
  readPostMarkdown,
  removeLocalPost,
} from "@/lib/blog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });

  const post = await getAdminPost(slug);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });

  const md = await readPostMarkdown(slug);
  if (!md) return NextResponse.json({ error: "Thiếu file markdown" }, { status: 404 });

  await insertPublished(post, md);
  await removeLocalPost(slug);

  return NextResponse.json({ ok: true });
}
