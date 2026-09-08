import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const webhook = process.env.GSHEET_WEBHOOK_URL;
  const token = process.env.GSHEET_LIST_TOKEN;
  if (!webhook || !token) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình GSHEET_WEBHOOK_URL hoặc GSHEET_LIST_TOKEN." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không hợp lệ" }, { status: 400 });
  }

  const action = body?.action;
  const row = Number(body?.row);
  if (!action || !row) {
    return NextResponse.json({ ok: false, error: "Thiếu action hoặc row" }, { status: 400 });
  }
  if (action !== "delete" && action !== "reply") {
    return NextResponse.json({ ok: false, error: "Action không hợp lệ" }, { status: 400 });
  }
  if (action === "reply") {
    if (!body?.to || !body?.body) {
      return NextResponse.json({ ok: false, error: "Thiếu email hoặc nội dung" }, { status: 400 });
    }
  }

  try {
    const payload = { ...body, token };
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
      cache: "no-store",
    });
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
    if (!data?.v || data.v < 2) {
      throw new Error(
        "Apps Script chưa được deploy version mới có handler reply/delete. Vào Apps Script → Deploy → Manage deployments → Edit → Version: New version → Deploy."
      );
    }
    return NextResponse.json({ ok: true, quotaLeft: data.quotaLeft });
  } catch (err: any) {
    console.error("[feedback/action] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Thao tác thất bại." },
      { status: 500 }
    );
  }
}
