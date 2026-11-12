import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  deleteDidYouKnow,
  dykImageCredit,
  listAdminDidYouKnow,
  listPublicDidYouKnow,
  normDykQuiz,
  slugify,
  updateDidYouKnow,
  upsertDidYouKnow,
  type DidYouKnowImage,
} from "@/lib/blog";
import { normStamp } from "@/lib/dyk-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (await isAdmin()) return NextResponse.json({ items: await listAdminDidYouKnow() });
  return NextResponse.json({ items: await listPublicDidYouKnow() });
}

function sanitizeImages(input: unknown): DidYouKnowImage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((it) => {
      if (!it || typeof it !== "object") return null;
      const o = it as any;
      const url = typeof o.url === "string" ? o.url.trim() : "";
      if (!url) return null;
      return {
        url,
        caption_vi: typeof o.caption_vi === "string" ? o.caption_vi : "",
        caption_en: typeof o.caption_en === "string" ? o.caption_en : "",
        ...dykImageCredit(o),
      };
    })
    .filter(Boolean) as DidYouKnowImage[];
}

// DB chưa chạy migration thêm cột `stamp` thì báo rõ thay vì lỗi PostgREST khó hiểu.
function dbError(e: any): string {
  const msg = e?.message || "DB lỗi";
  if (/stamp/i.test(msg) && /column|schema cache/i.test(msg)) {
    return "Chưa có cột `stamp` trong blog_did_you_know — chạy đoạn `add column if not exists stamp` trong supabase/schema.sql rồi lưu lại.";
  }
  return msg;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title_vi = (body?.title_vi ?? "").toString().trim();
  if (!title_vi) return NextResponse.json({ error: "Thiếu tiêu đề VI" }, { status: 400 });
  const slug = slugify((body?.slug ?? title_vi).toString().trim());
  if (!slug) return NextResponse.json({ error: "Slug không hợp lệ" }, { status: 400 });
  try {
    await upsertDidYouKnow({
      slug,
      tag_vi: (body?.tag_vi ?? "").toString(),
      tag_en: (body?.tag_en ?? "").toString(),
      title_vi,
      title_en: (body?.title_en ?? "").toString(),
      intro_vi: (body?.intro_vi ?? "").toString(),
      intro_en: (body?.intro_en ?? "").toString(),
      images: sanitizeImages(body?.images),
      sort: Number.isFinite(body?.sort) ? Number(body.sort) : 0,
      active: body?.active !== false,
      ...(Array.isArray(body?.quiz) ? { quiz: normDykQuiz(body.quiz) } : {}),
      ...(normStamp(body?.stamp) ? { stamp: normStamp(body.stamp)! } : {}),
    });
    return NextResponse.json({ ok: true, slug });
  } catch (e: any) {
    return NextResponse.json({ error: dbError(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const slug = (body?.slug ?? "").toString().trim();
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  for (const k of ["tag_vi", "tag_en", "title_vi", "title_en", "intro_vi", "intro_en"] as const) {
    if (typeof body?.[k] === "string") patch[k] = body[k];
  }
  if (Array.isArray(body?.images)) patch.images = sanitizeImages(body.images);
  if (Number.isFinite(body?.sort)) patch.sort = Number(body.sort);
  if (typeof body?.active === "boolean") patch.active = body.active;
  if (Array.isArray(body?.quiz)) patch.quiz = normDykQuiz(body.quiz);
  // `stamp: null` bỏ tem riêng để hiện vật quay về mặc định chung.
  if (body?.stamp === null) patch.stamp = null;
  else if (body?.stamp !== undefined) {
    const stamp = normStamp(body.stamp);
    if (stamp) patch.stamp = stamp;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });
  try {
    await updateDidYouKnow(slug, patch as any);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: dbError(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  try {
    await deleteDidYouKnow(slug);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
}
