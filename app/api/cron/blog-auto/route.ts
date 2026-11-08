import { isCronRequest } from "@/lib/admin-auth";
import { runAutoTick } from "@/lib/blog-auto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cron requests carry no cookies, so reads would otherwise hit Next's Data Cache.
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// Called every minute by Supabase pg_cron (supabase/blog_auto.sql).
export async function POST(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await runAutoTick(new URL(req.url).origin);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
