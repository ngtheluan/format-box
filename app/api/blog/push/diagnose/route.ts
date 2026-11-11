import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { diagnoseVapid } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trả thông tin cấu hình VAPID hiện tại mà không lộ private key — dùng để
// xác định BadJwtToken là do mismatch cặp key hay subject sai.
export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const vapid = diagnoseVapid();
  let subscriptions: number | string = "?";
  let lastEndpointHost = "";
  try {
    const { count } = await supabaseAdmin()
      .from("push_subscriptions")
      .select("endpoint", { count: "exact", head: false });
    subscriptions = typeof count === "number" ? count : "?";
    const { data } = await supabaseAdmin()
      .from("push_subscriptions")
      .select("endpoint")
      .order("last_seen_at", { ascending: false })
      .limit(1);
    if (data && data[0]?.endpoint) {
      try {
        lastEndpointHost = new URL(data[0].endpoint as string).host;
      } catch {}
    }
  } catch (e: any) {
    subscriptions = `lỗi: ${e?.message || e}`;
  }
  return NextResponse.json({ ...vapid, subscriptions, lastEndpointHost });
}
