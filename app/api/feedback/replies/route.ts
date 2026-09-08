import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Thiếu email" }, { status: 400 });
  }

  const webhook = process.env.GSHEET_WEBHOOK_URL;
  const token = process.env.GSHEET_LIST_TOKEN;
  if (!webhook || !token) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình GSHEET_WEBHOOK_URL hoặc GSHEET_LIST_TOKEN." },
      { status: 500 }
    );
  }

  try {
    const url = `${webhook}${webhook.includes("?") ? "&" : "?"}action=replies&token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store" });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Phản hồi không phải JSON: ${text.slice(0, 200)}`);
    }
    if (!res.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${res.status}`);
    return NextResponse.json({ ok: true, items: data.items || [] });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Không lấy được lịch sử trả lời." },
      { status: 500 }
    );
  }
}
