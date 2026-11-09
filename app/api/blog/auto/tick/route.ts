import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { getAutoStatus, runAutoTick } from "@/lib/blog-auto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// Same as the pg_cron route: one tick generates one full post through
// /api/blog/generate, which can take minutes.
export const maxDuration = 300;

// Lets the admin tab (or a local dev box where Supabase pg_cron cannot reach
// localhost) run one generation now instead of waiting for the next cron
// minute. Concurrency with pg_cron is safe: `claimJob` holds an atomic lease,
// so a second caller gets "idle" and returns immediately.
export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const origin = new URL(req.url).origin;
    const result = await runAutoTick(origin);
    const status = await getAutoStatus();
    return NextResponse.json({ ok: true, result, status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
