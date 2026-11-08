import { NextResponse } from "next/server";
import { getAutoStatus } from "@/lib/blog-auto";
import { isSuperAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// force-dynamic alone left the Supabase read in Next's Data Cache: nothing here
// touches cookies() before it, so the UI kept seeing a stale `running: true`.
export const fetchCache = "force-no-store";

// Public GET — only exposes a minimal running flag + generated count so the
// public /blog page can show a subtle indicator; superadmins get the full
// detail (current topic, recent, lastError…).
export async function GET() {
  const full = await getAutoStatus();
  if (await isSuperAdmin()) return NextResponse.json(full);
  return NextResponse.json({
    running: full.running,
    generated: full.generated,
    startedAt: full.startedAt,
  });
}
