import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StatRow = { href: string; day: string; count: number };

export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin().from("analytics").select("href, day, count").gte("day", sinceStr);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data as StatRow[]) ?? [];

  // Per-tool totals
  const byTool = new Map<string, number>();
  // Per-day totals across all tools
  const byDay = new Map<string, number>();
  let total = 0;

  for (const r of rows) {
    const c = Number(r.count) || 0;
    total += c;
    byTool.set(r.href, (byTool.get(r.href) || 0) + c);
    byDay.set(r.day, (byDay.get(r.day) || 0) + c);
  }

  const perTool = [...byTool.entries()].map(([href, count]) => ({ href, count })).sort((a, b) => b.count - a.count);

  // Dense daily series (fill gaps with 0) for a clean chart
  const series: { day: string; count: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({ day: key, count: byDay.get(key) || 0 });
  }

  return NextResponse.json({
    ok: true,
    days,
    total,
    toolCount: perTool.length,
    perTool,
    series,
  });
}
