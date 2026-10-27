import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { USER_COOKIE, makeUserToken, maxAgeForRole, verifyPassword } from "@/lib/user-auth";
import { getClientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_IP = 20; // per IP in window
const LOGIN_MAX_ACCT = 5; // per accountname in window

export async function POST(req: Request) {
  const { accountname, password } = await req.json().catch(() => ({}));
  if (!accountname || !password) {
    return NextResponse.json({ ok: false, error: "Thiếu tài khoản hoặc mật khẩu" }, { status: 400 });
  }
  const ip = getClientIp(req);
  const ipHit = rateLimit(`login:ip:${ip}`, LOGIN_MAX_IP, LOGIN_WINDOW_MS);
  const acctHit = rateLimit(`login:acct:${String(accountname).toLowerCase()}`, LOGIN_MAX_ACCT, LOGIN_WINDOW_MS);
  if (!ipHit.ok || !acctHit.ok) {
    const retryMs = Math.max(ipHit.retryAfterMs, acctHit.retryAfterMs);
    const retrySec = Math.ceil(retryMs / 1000);
    return NextResponse.json(
      { ok: false, error: `Thử lại sau ${Math.ceil(retrySec / 60)} phút` },
      { status: 429, headers: { "Retry-After": String(retrySec) } },
    );
  }
  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("app_users")
    .select("id, accountname, firstname, lastname, password_hash, role")
    .eq("accountname", accountname)
    .maybeSingle();
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ ok: false, error: "Sai tài khoản hoặc mật khẩu", notFound: !user }, { status: 401 });
  }
  resetRateLimit(`login:acct:${String(accountname).toLowerCase()}`);
  const role: "user" | "admin" | "superadmin" =
    user.role === "superadmin" ? "superadmin" : user.role === "admin" ? "admin" : "user";
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, accountname: user.accountname, firstname: user.firstname, lastname: user.lastname, role },
  });
  res.cookies.set(USER_COOKIE, makeUserToken(user.id, role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeForRole(role),
  });
  return res;
}
