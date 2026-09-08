import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { toolToRow } from "@/lib/tools";
import { SEED_TOOLS } from "@/lib/tools-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rows = SEED_TOOLS.map((t, i) => ({
    ...toolToRow(t),
    sort: (i + 1) * 10,
  }));
  const { error } = await supabaseAdmin().from("tools").upsert(rows, { onConflict: "href" });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  revalidateTag("tools");
  return NextResponse.json({ ok: true, count: rows.length });
}
