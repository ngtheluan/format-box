import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { DICT } from "@/lib/i18n-dict";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sectionOf(key: string): string {
  const i = key.indexOf("_");
  return i > 0 ? key.slice(0, i) : "misc";
}

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const rows = Object.entries(DICT).map(([key, v]) => ({
    key,
    vi: (v as { vi: string }).vi ?? "",
    en: (v as { en: string }).en ?? "",
    section: sectionOf(key),
  }));
  const { error } = await supabaseAdmin()
    .from("translations")
    .upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  revalidateTag("translations");
  return NextResponse.json({ ok: true, count: rows.length });
}
