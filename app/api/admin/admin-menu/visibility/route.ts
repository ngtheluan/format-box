import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const revalidate = 60;

// Public (within-site) read used by the edge middleware to gate /admin/* pages
// for the `admin` role. Returns only the hrefs that are hidden; the list is
// not sensitive — it is a set of paths the dashboard already renders.
export async function GET() {
  try {
    const { data } = await supabaseAdmin()
      .from("admin_menu_visibility")
      .select("href, visible_admin");
    const hidden = (data ?? []).filter((r) => r.visible_admin === false).map((r) => r.href);
    return NextResponse.json({ hidden }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } });
  } catch {
    return NextResponse.json({ hidden: [] });
  }
}
