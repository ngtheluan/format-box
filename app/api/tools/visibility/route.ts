import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const revalidate = 60;

// Edge middleware calls this to decide if a given role may view a tool.
// Returns three disjoint sets of hrefs: tools active + visible to guests,
// active + visible to logged-in users, and all active tools (admin sees these).
export async function GET() {
  const sb = supabase();
  const empty = { active: [] as string[], guest: [] as string[], user: [] as string[] };
  if (!sb) return NextResponse.json(empty);
  const { data, error } = await sb
    .from("tools")
    .select("href, active, visible_guest, visible_user")
    .eq("active", true);
  if (error || !data) return NextResponse.json(empty);
  const rows = data as { href: string; visible_guest: boolean | null; visible_user: boolean | null }[];
  return NextResponse.json(
    {
      active: rows.map((r) => r.href),
      guest: rows.filter((r) => r.visible_guest ?? true).map((r) => r.href),
      user: rows.filter((r) => r.visible_user ?? true).map((r) => r.href),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
