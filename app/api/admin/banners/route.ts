import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { bannerToRow, type Banner } from "@/lib/banners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

const SLUG = /^[a-z0-9-]+$/;

export async function GET() {
  if (!isAdmin()) return unauth();
  const { data, error } = await supabaseAdmin()
    .from("banners")
    .select("*")
    .order("sort", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, banners: data });
}

export async function POST(req: Request) {
  if (!isAdmin()) return unauth();
  const banner = (await req.json()) as Banner;
  if (!banner.id || !SLUG.test(banner.id)) {
    return NextResponse.json({ ok: false, error: "id phải viết thường, chỉ chữ/số/dấu -" }, { status: 400 });
  }
  if (!banner.messageVi?.trim()) {
    return NextResponse.json({ ok: false, error: "Cần nhập nội dung tiếng Việt" }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("banners").insert(bannerToRow(banner));
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("banners");
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  if (!isAdmin()) return unauth();
  const banner = (await req.json()) as Banner;
  if (!banner.id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  if (!banner.messageVi?.trim()) {
    return NextResponse.json({ ok: false, error: "Cần nhập nội dung tiếng Việt" }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("banners").upsert(bannerToRow(banner), { onConflict: "id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("banners");
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  if (!isAdmin()) return unauth();
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const { error } = await supabaseAdmin()
    .from("banners")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("banners");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAdmin()) return unauth();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const { error } = await supabaseAdmin().from("banners").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("banners");
  return NextResponse.json({ ok: true });
}
