import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  countPostsInCategory,
  deleteCategory,
  listAdminCategories,
  listPublicCategories,
  slugify,
  updateCategory,
  upsertCategory,
} from "@/lib/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (await isAdmin()) {
    return NextResponse.json({ categories: await listAdminCategories() });
  }
  return NextResponse.json({ categories: await listPublicCategories() });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const rawSlug = (body?.slug ?? "").toString().trim();
  const label = (body?.label ?? "").toString().trim();
  if (!label) return NextResponse.json({ error: "Thiếu label" }, { status: 400 });
  const slug = rawSlug ? slugify(rawSlug) : slugify(label);
  if (!slug) return NextResponse.json({ error: "Slug không hợp lệ" }, { status: 400 });
  const sort = Number.isFinite(body?.sort) ? Number(body.sort) : 0;
  const active = body?.active !== false;
  try {
    await upsertCategory({ slug, label, sort, active });
    return NextResponse.json({ ok: true, slug });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const slug = (body?.slug ?? "").toString().trim();
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof body?.label === "string") patch.label = body.label.trim();
  if (Number.isFinite(body?.sort)) patch.sort = Number(body.sort);
  if (typeof body?.active === "boolean") patch.active = body.active;
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });
  try {
    await updateCategory(slug, patch as any);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  const n = await countPostsInCategory(slug);
  if (n > 0) {
    return NextResponse.json(
      { error: `Không xoá được: còn ${n} bài trong danh mục này. Hãy đổi category của chúng trước.` },
      { status: 409 },
    );
  }
  try {
    await deleteCategory(slug);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
}
