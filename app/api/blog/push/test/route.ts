import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { sendPushToEndpoint } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bắn 1 push thật qua APNs/FCM tới đúng thiết bị đang bấm "Gửi thử" — kiểm
// tra cả đường server → push service → service worker, không chỉ quyền.
// Mọi throw phải được bắt lại ở đây để client nhận error text thay vì 500 trần.
export async function POST(req: Request) {
  try {
    if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
    if (!endpoint?.trim()) return NextResponse.json({ error: "Thiếu endpoint" }, { status: 400 });
    const result = await sendPushToEndpoint(endpoint.trim(), {
      type: "blog-push-test",
      title: "Thông báo đã hoạt động trên thiết bị này",
    });
    if (!result.sent) {
      return NextResponse.json({ error: result.errors[0] || "Không gửi được" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[push] test route failed", e);
    return NextResponse.json({ error: e?.message || "Push test lỗi" }, { status: 502 });
  }
}
