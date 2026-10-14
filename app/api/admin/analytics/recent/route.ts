import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 500);
  const href = url.searchParams.get("href");
  const ip = url.searchParams.get("ip");

  let q = supabaseAdmin()
    .from("analytics_events")
    .select("id, href, ip, ua, country, city, region, referer, lang, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (href) q = q.eq("href", href);
  if (ip) q = q.eq("ip", ip);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = data ?? [];
  const uniqueIps = new Set(rows.map((r: any) => r.ip).filter(Boolean)).size;
  const byCountry = new Map<string, number>();
  for (const r of rows as any[]) {
    const c = r.country || "??";
    byCountry.set(c, (byCountry.get(c) || 0) + 1);
  }
  const countries = [...byCountry.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ ok: true, rows, uniqueIps, countries });
}
