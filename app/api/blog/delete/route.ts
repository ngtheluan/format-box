import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/admin-auth";
import { deletePost } from "@/lib/blog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  try {
    await deletePost(slug);
    // best-effort: remove cover images if any
    const coverDir = path.join(process.cwd(), "public", "blog-covers");
    try {
      await fs.unlink(path.join(coverDir, `${slug}.jpg`));
    } catch {}
    for (let i = 1; i <= 5; i++) {
      try {
        await fs.unlink(path.join(coverDir, `${slug}-${i}.jpg`));
      } catch {}
    }
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Xoá lỗi" }, { status: 500 });
  }
}
