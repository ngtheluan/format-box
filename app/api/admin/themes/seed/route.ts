import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { themeToRow } from "@/lib/themes";
import { SEED_THEMES } from "@/lib/themes-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rows = SEED_THEMES.map((t) => themeToRow(t));
  const { error } = await supabaseAdmin().from("themes").upsert(rows, { onConflict: "id" });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  revalidateTag("themes");
  return NextResponse.json({ ok: true, count: rows.length });
}
