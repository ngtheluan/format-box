import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { SEED_TOOLS } from "@/lib/tools-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN = new Set(SEED_TOOLS.map((t) => t.href));

// Fire-and-forget view counter. Always resolves 204 so it never disrupts the
// page — analytics is best-effort, not critical path.
export async function POST(req: Request) {
  try {
    const { href } = (await req.json().catch(() => ({}))) as { href?: string };
    if (href && KNOWN.has(href)) {
      const sb = supabase();
      if (sb) await sb.rpc("bump_tool_view", { p_href: href });
    }
  } catch {
    // swallow — tracking must never surface an error to the client
  }
  return new NextResponse(null, { status: 204 });
}
