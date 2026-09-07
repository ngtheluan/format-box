import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const message = String(form.get("message") || "").trim();
    const file = form.get("attachment");

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Vui lòng điền đầy đủ Tên, Email và Nội dung." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Email không hợp lệ." },
        { status: 400 }
      );
    }

    const webhook = process.env.GSHEET_WEBHOOK_URL;
    if (!webhook) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Chưa cấu hình GSHEET_WEBHOOK_URL trong .env.local (Google Apps Script Web App URL).",
        },
        { status: 500 }
      );
    }

    const payload: Record<string, any> = {
      timestamp: new Date().toISOString(),
      name,
      email,
      message,
      userAgent: req.headers.get("user-agent") || "",
    };

    if (file && typeof file === "object" && "arrayBuffer" in file) {
      const f = file as File;
      if (f.size > 0) {
        if (f.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { ok: false, error: "File đính kèm vượt quá 10MB." },
            { status: 400 }
          );
        }
        const buf = Buffer.from(await f.arrayBuffer());
        payload.file = {
          name: f.name || "attachment",
          mime: f.type || "application/octet-stream",
          size: f.size,
          base64: buf.toString("base64"),
        };
      }
    }

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Google Sheets webhook lỗi ${res.status}: ${text.slice(0, 200)}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[feedback] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Gửi góp ý thất bại." },
      { status: 500 }
    );
  }
}
