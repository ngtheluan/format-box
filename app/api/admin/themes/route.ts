import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { themeToRow, type Theme } from "@/lib/themes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  if (!isAdmin()) return unauth();
  const { data, error } = await supabaseAdmin()
    .from("themes")
    .select("*")
    .order("sort", { ascending: true })
    .order("name_vi", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, themes: data });
}

export async function POST(req: Request) {
  if (!isAdmin()) return unauth();
  const theme = (await req.json()) as Theme;
  if (!theme.id || !/^[a-z0-9-]+$/.test(theme.id)) {
    return NextResponse.json({ ok: false, error: "id phải viết thường, chỉ chữ/số/dấu -" }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("themes").insert(themeToRow(theme));
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("themes");
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  if (!isAdmin()) return unauth();
  const theme = (await req.json()) as Theme;
  const { error } = await supabaseAdmin().from("themes").upsert(themeToRow(theme), { onConflict: "id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("themes");
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  if (!isAdmin()) return unauth();
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const { error } = await supabaseAdmin().from("themes").update(patch).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("themes");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAdmin()) return unauth();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  if (id === "modern") {
    return NextResponse.json({ ok: false, error: "Không thể xóa theme Modern" }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("themes").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("themes");
  return NextResponse.json({ ok: true });
}
