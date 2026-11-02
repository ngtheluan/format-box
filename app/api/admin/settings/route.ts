import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set(["menu_sort_mode"]);

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ ok: false, error: "Invalid key" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin()
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, value: data?.value ?? null });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { key, value } = body as { key?: string; value?: unknown };
  if (!key || !ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ ok: false, error: "Invalid key" }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (key === "menu_sort_mode") revalidateTag("tools");
  return NextResponse.json({ ok: true });
}
