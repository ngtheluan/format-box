import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const BUG_TYPE_LABEL: Record<string, string> = {
  load: "Trang lỗi / không tải",
  wrong: "Thông tin / kết quả sai",
  content: "Nội dung / giao diện lệch",
  action: "Nút hoặc chức năng không chạy",
  other: "Khác",
};

const HELPFULNESS_LABEL: Record<string, string> = {
  yes: "Có, xong việc",
  partial: "Một phần",
  no: "Chưa giúp được",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function detectDevice(ua: string): string {
  const s = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return "iOS";
  if (/android/.test(s)) return "Android";
  if (/mac os/.test(s)) return "macOS";
  if (/windows/.test(s)) return "Windows";
  if (/linux/.test(s)) return "Linux";
  return "Khác";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    // Legacy fields (older client may still send them).
    const legacyName = String(form.get("name") || "").trim();
    const legacyEmail = String(form.get("email") || "").trim();
    const legacyMessage = String(form.get("message") || "").trim();
    const file = form.get("attachment");

    // New structured fields.
    const kind = String(form.get("kind") || "").trim();
    const content = String(form.get("content") || "").trim();
    const contact = String(form.get("contact") || "").trim();
    const allowContact = String(form.get("allowContact") || "") === "1";
    const pageUrl = String(form.get("pageUrl") || "").trim();
    const rating = Number(form.get("rating") || 0);
    const helpfulness = String(form.get("helpfulness") || "").trim();
    const errorTypes = String(form.get("errorTypes") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const userAgent = req.headers.get("user-agent") || "";
    const device = detectDevice(userAgent);

    // Resolve into a shape backwards-compatible with the Google Sheets webhook.
    let name: string;
    let email: string;
    let message: string;

    if (kind === "rating" || kind === "bug") {
      // New flow.
      if (kind === "rating") {
        if (!rating || rating < 1 || rating > 5) {
          return NextResponse.json(
            { ok: false, error: "Vui lòng chấm sao từ 1 đến 5." },
            { status: 400 }
          );
        }
      } else {
        if (errorTypes.length === 0) {
          return NextResponse.json(
            { ok: false, error: "Chọn ít nhất một loại lỗi." },
            { status: 400 }
          );
        }
        if (content.length < 10) {
          return NextResponse.json(
            { ok: false, error: "Mô tả lỗi cần ít nhất 10 ký tự." },
            { status: 400 }
          );
        }
      }

      email = contact && EMAIL_RE.test(contact) ? contact : "";

      const parts: string[] = [];
      if (kind === "rating") {
        name = `★${rating} • Đánh giá`;
        parts.push(`Chấm sao: ${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)`);
        if (helpfulness && HELPFULNESS_LABEL[helpfulness]) {
          parts.push(`Giúp hoàn thành: ${HELPFULNESS_LABEL[helpfulness]}`);
        }
      } else {
        const labels = errorTypes.map((id) => BUG_TYPE_LABEL[id] || id);
        name = `🐞 Báo lỗi • ${labels.slice(0, 2).join(", ")}${labels.length > 2 ? "…" : ""}`;
        parts.push(`Loại lỗi: ${labels.join(", ")}`);
      }

      if (content) parts.push(`\n${content}`);
      parts.push("");
      parts.push("—");
      if (pageUrl) parts.push(`Trang: ${pageUrl}`);
      parts.push(`Thiết bị: ${device}`);
      if (contact) {
        parts.push(`Liên hệ: ${contact}${allowContact ? " (OK liên hệ lại)" : ""}`);
      }

      message = parts.join("\n");
    } else {
      // Legacy flow — keep original validation.
      if (!legacyName || !legacyEmail || !legacyMessage) {
        return NextResponse.json(
          { ok: false, error: "Vui lòng điền đầy đủ Tên, Email và Nội dung." },
          { status: 400 }
        );
      }
      if (!EMAIL_RE.test(legacyEmail)) {
        return NextResponse.json(
          { ok: false, error: "Email không hợp lệ." },
          { status: 400 }
        );
      }
      name = legacyName;
      email = legacyEmail;
      message = legacyMessage;
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
      userAgent,
    };

    // Attach structured metadata so downstream can filter/report by shape.
    if (kind === "rating" || kind === "bug") {
      payload.meta = {
        kind,
        rating: kind === "rating" ? rating : undefined,
        helpfulness: kind === "rating" ? helpfulness || undefined : undefined,
        errorTypes: kind === "bug" ? errorTypes : undefined,
        contact: contact || undefined,
        allowContact,
        pageUrl: pageUrl || undefined,
        device,
      };
    }

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
