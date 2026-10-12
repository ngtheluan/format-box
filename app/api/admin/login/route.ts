import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { USER_COOKIE, USER_MAX_AGE, makeUserToken, verifyPassword } from "@/lib/user-auth";

export const runtime = "nodejs";

// Admin login = regular user login + role must be 'admin'. On success the
// standard user cookie is set so the whole site (not just /admin) knows the
// viewer is an admin.
export async function POST(req: Request) {
  const { accountname, password } = await req.json().catch(() => ({}));
  if (!accountname || !password) {
    return NextResponse.json({ ok: false, error: "Thiếu tài khoản hoặc mật khẩu" }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("app_users")
    .select("id, accountname, firstname, lastname, password_hash, role")
    .eq("accountname", accountname)
    .maybeSingle();
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ ok: false, error: "Sai tài khoản hoặc mật khẩu" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Tài khoản không có quyền quản trị" }, { status: 403 });
  }
  const res = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      accountname: user.accountname,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
    },
  });
  res.cookies.set(USER_COOKIE, makeUserToken(user.id, "admin"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(USER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
