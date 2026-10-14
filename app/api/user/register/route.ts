import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { USER_COOKIE, USER_MAX_AGE, hashPassword, makeUserToken } from "@/lib/user-auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { firstname, lastname, accountname, password, email } = await req.json().catch(() => ({}));
  if (!firstname || !lastname || !accountname || !password) {
    return NextResponse.json({ ok: false, error: "Thiếu thông tin" }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Email không hợp lệ" }, { status: 400 });
  }
  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ ok: false, error: `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự` }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data: existing } = await sb.from("app_users").select("id").eq("accountname", accountname).maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: false, error: "Tên tài khoản đã tồn tại" }, { status: 409 });
  }
  const { data, error } = await sb
    .from("app_users")
    .insert({ accountname, firstname, lastname, email: email || null, password_hash: hashPassword(password) })
    .select("id, accountname, firstname, lastname, email")
    .single();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message || "Lỗi tạo tài khoản" }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true, user: data });
  res.cookies.set(USER_COOKIE, makeUserToken(data.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_MAX_AGE,
  });
  return res;
}
