import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauth = () => NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

type Row = { key: string; vi: string; en: string; section: string };

function sectionOf(key: string): string {
  const i = key.indexOf("_");
  return i > 0 ? key.slice(0, i) : "misc";
}

export async function GET() {
  if (!isAdmin()) return unauth();
  const { data, error } = await supabaseAdmin()
    .from("translations")
    .select("key, vi, en, section, updated_at")
    .order("section", { ascending: true })
    .order("key", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, translations: data ?? [] });
}

export async function POST(req: Request) {
  if (!isAdmin()) return unauth();
  const { key, vi = "", en = "", section } = (await req.json().catch(() => ({}))) as Partial<Row>;
  if (!key) return NextResponse.json({ ok: false, error: "Thiếu key" }, { status: 400 });
  const row: Row = { key, vi, en, section: section || sectionOf(key) };
  const { error } = await supabaseAdmin().from("translations").insert(row);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("translations");
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  if (!isAdmin()) return unauth();
  const { key, ...patch } = (await req.json().catch(() => ({}))) as Partial<Row> & { key?: string };
  if (!key) return NextResponse.json({ ok: false, error: "Thiếu key" }, { status: 400 });
  const { error } = await supabaseAdmin().from("translations").update(patch).eq("key", key);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("translations");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAdmin()) return unauth();
  const { key } = await req.json().catch(() => ({}));
  if (!key) return NextResponse.json({ ok: false, error: "Thiếu key" }, { status: 400 });
  const { error } = await supabaseAdmin().from("translations").delete().eq("key", key);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("translations");
  return NextResponse.json({ ok: true });
}
