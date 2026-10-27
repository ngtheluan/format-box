import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isSuperAdmin } from "@/lib/admin-auth";
import { updateStatus } from "@/lib/blog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  try {
    await updateStatus(slug, "draft");
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
}
