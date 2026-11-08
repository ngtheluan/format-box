import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { stopAuto } from "@/lib/blog-auto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status = stopAuto();
  return NextResponse.json({ ok: true, status });
}
