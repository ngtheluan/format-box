import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { startAuto, getAutoStatus } from "@/lib/blog-auto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    category?: string;
    unlimited?: boolean;
    count?: number;
    provider?: string;
    model?: string;
  };
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const cookie = req.headers.get("cookie") || undefined;
  const status = await startAuto({
    category: body.category || "random",
    unlimited: !!body.unlimited,
    count: Number(body.count) || 10,
    provider: body.provider,
    model: body.model,
    baseUrl,
    cookie,
  });
  return NextResponse.json({ ok: true, status });
}
