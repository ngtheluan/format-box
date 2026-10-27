import { NextResponse } from "next/server";
import { isAdmin, isSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_APP_HREFS } from "@/lib/admin-apps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin()
    .from("admin_menu_visibility")
    .select("href, visible_admin");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) map[row.href] = row.visible_admin;
  return NextResponse.json({ ok: true, visibility: map });
}

export async function PATCH(req: Request) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ ok: false, error: "Chỉ superadmin được chỉnh" }, { status: 403 });
  }
  const { href, visibleAdmin } = await req.json().catch(() => ({}));
  if (typeof href !== "string" || !ADMIN_APP_HREFS.has(href)) {
    return NextResponse.json({ ok: false, error: "href không hợp lệ" }, { status: 400 });
  }
  if (typeof visibleAdmin !== "boolean") {
    return NextResponse.json({ ok: false, error: "visibleAdmin phải là boolean" }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from("admin_menu_visibility")
    .upsert({ href, visible_admin: visibleAdmin, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
