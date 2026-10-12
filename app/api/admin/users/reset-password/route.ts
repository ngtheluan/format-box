import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generatePassword(len = 10): string {
  // base64url, dễ gõ, loại ký tự dễ nhầm
  const raw = randomBytes(16).toString("base64url").replace(/[-_]/g, "");
  return raw.slice(0, len);
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("app_users")
    .select("id, accountname, email, firstname, lastname")
    .eq("id", id)
    .maybeSingle();
  if (!user) return NextResponse.json({ ok: false, error: "Không tìm thấy user" }, { status: 404 });
  if (!user.email) {
    return NextResponse.json({ ok: false, error: "User chưa có email, không gửi được." }, { status: 400 });
  }

  const newPassword = generatePassword();
  const { error: upErr } = await sb
    .from("app_users")
    .update({ password_hash: hashPassword(newPassword) })
    .eq("id", id);
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  const webhook = process.env.GSHEET_WEBHOOK_URL;
  const token = process.env.GSHEET_LIST_TOKEN;
  if (!webhook || !token) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình GSHEET_WEBHOOK_URL/GSHEET_LIST_TOKEN để gửi mail." },
      { status: 500 }
    );
  }

  const subject = "FormatBox - Mật khẩu mới của bạn";
  const body = [
    `Xin chào ${user.firstname} ${user.lastname},`,
    "",
    "Mật khẩu tài khoản FormatBox của bạn đã được đặt lại.",
    "",
    `Tên tài khoản: ${user.accountname}`,
    `Mật khẩu mới: ${newPassword}`,
    "",
    "Vui lòng đăng nhập và đổi lại mật khẩu khi cần.",
  ].join("\n");

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", to: user.email, subject, body, token }),
      redirect: "follow",
      cache: "no-store",
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error(`Phản hồi không phải JSON: ${text.slice(0, 200)}`); }
    if (!res.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${res.status}`);
    return NextResponse.json({ ok: true, sentTo: user.email });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `Đã đặt lại mật khẩu nhưng gửi mail thất bại: ${err?.message || err}` },
      { status: 500 }
    );
  }
}
