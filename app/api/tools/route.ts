import { NextResponse } from "next/server";
import { getTools } from "@/lib/tools";
import { isToolVisible, type Role } from "@/lib/tools-shared";
import { currentUser } from "@/lib/user-auth";

export const runtime = "nodejs";
// Dynamic: output depends on the viewer's role cookie.
export const dynamic = "force-dynamic";

export async function GET() {
  const tools = await getTools();
  const role: Role = currentUser()?.role ?? "guest";
  const filtered = tools.filter((t) => isToolVisible(t, role));
  return NextResponse.json(
    { tools: filtered, role },
    // Private so edge/CDN won't share across users (role differs), but let the
    // browser reuse the response for a minute to cut repeat hits.
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
