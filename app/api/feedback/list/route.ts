import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const webhook = process.env.GSHEET_WEBHOOK_URL;
  const token = process.env.GSHEET_LIST_TOKEN;
  if (!webhook || !token) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Chưa cấu hình GSHEET_WEBHOOK_URL hoặc GSHEET_LIST_TOKEN trong .env.local.",
      },
      { status: 500 }
    );
  }

  try {
    const url = `${webhook}${webhook.includes("?") ? "&" : "?"}action=list&token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store" });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Phản hồi không phải JSON: ${text.slice(0, 200)}`);
    }
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return NextResponse.json({
      ok: true,
      items: data.items || [],
      replyCounts: data.replyCounts || {},
    });
  } catch (err: any) {
    console.error("[feedback/list] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Không lấy được danh sách góp ý." },
      { status: 500 }
    );
  }
}
