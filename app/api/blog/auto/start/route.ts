import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import type { AutoGenOptions } from "@/lib/blog-ai-shared";
import { startAuto } from "@/lib/blog-auto";

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
    options?: Partial<AutoGenOptions>;
  };
  try {
    const status = await startAuto({
      category: body.category,
      unlimited: !!body.unlimited,
      count: Number(body.count) || 10,
      provider: body.provider,
      model: body.model,
      options: body.options,
    });
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
