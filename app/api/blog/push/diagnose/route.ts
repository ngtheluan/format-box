import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { diagnoseVapid } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trả thông tin cấu hình VAPID hiện tại mà không lộ private key — dùng để
// xác định BadJwtToken là do mismatch cặp key hay subject sai.
export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(diagnoseVapid());
}
