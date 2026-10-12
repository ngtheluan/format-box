import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { USER_COOKIE, USER_MAX_AGE, makeUserToken, verifyPassword } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { accountname, password } = await req.json().catch(() => ({}));
  if (!accountname || !password) {
    return NextResponse.json({ ok: false, error: "Thiếu tài khoản hoặc mật khẩu" }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("app_users")
    .select("id, accountname, firstname, lastname, password_hash")
    .eq("accountname", accountname)
    .maybeSingle();
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ ok: false, error: "Sai tài khoản hoặc mật khẩu", notFound: !user }, { status: 401 });
  }
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, accountname: user.accountname, firstname: user.firstname, lastname: user.lastname },
  });
  res.cookies.set(USER_COOKIE, makeUserToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_MAX_AGE,
  });
  return res;
}
