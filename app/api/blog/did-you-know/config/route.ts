import { NextResponse } from "next/server";
import { isAdmin, isSuperAdmin } from "@/lib/admin-auth";
import { getDykConfig, setDykConfig } from "@/lib/blog";
import { normDykConfig } from "@/lib/dyk-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mặc định chung cho quiz + tem của Bảo tàng tri thức (tab Kiến thức).
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ config: await getDykConfig(true) });
}

export async function PUT(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const config = await setDykConfig(normDykConfig(body?.config ?? body));
    return NextResponse.json({ ok: true, config });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
}
