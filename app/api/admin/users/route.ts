import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const unauth = () => NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

export async function GET(req: Request) {
  if (!isAdmin()) return unauth();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  let query = supabaseAdmin()
    .from("app_users")
    .select("id, accountname, email, firstname, lastname, role, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `accountname.ilike.${like},firstname.ilike.${like},lastname.ilike.${like},email.ilike.${like}`
    );
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, users: data ?? [] });
}

export async function POST(req: Request) {
  if (!isAdmin()) return unauth();
  const { accountname, firstname, lastname, password, email, role } = await req.json().catch(() => ({}));
  if (!accountname || !firstname || !lastname || !password) {
    return NextResponse.json({ ok: false, error: "Thiếu thông tin" }, { status: 400 });
  }
  if (String(password).length < 6) {
    return NextResponse.json({ ok: false, error: "Mật khẩu tối thiểu 6 ký tự" }, { status: 400 });
  }
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Email không hợp lệ" }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data: existing } = await sb.from("app_users").select("id").eq("accountname", accountname).maybeSingle();
  if (existing) return NextResponse.json({ ok: false, error: "Tên tài khoản đã tồn tại" }, { status: 409 });
  const safeRole: "user" | "admin" = role === "admin" ? "admin" : "user";
  const { data, error } = await sb
    .from("app_users")
    .insert({
      accountname,
      firstname,
      lastname,
      email: email || null,
      password_hash: hashPassword(password),
      role: safeRole,
    })
    .select("id, accountname, email, firstname, lastname, role, created_at, updated_at")
    .single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Lỗi tạo" }, { status: 500 });
  return NextResponse.json({ ok: true, user: data });
}

export async function PATCH(req: Request) {
  if (!isAdmin()) return unauth();
  const { id, firstname, lastname, password, email, role } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });
  const patch: Record<string, string | null> = {};
  if (role === "user" || role === "admin") patch.role = role;
  if (typeof firstname === "string" && firstname) patch.firstname = firstname;
  if (typeof lastname === "string" && lastname) patch.lastname = lastname;
  if (typeof email === "string") {
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Email không hợp lệ" }, { status: 400 });
    }
    patch.email = email || null;
  }
  if (typeof password === "string" && password) {
    if (password.length < 6) return NextResponse.json({ ok: false, error: "Mật khẩu tối thiểu 6 ký tự" }, { status: 400 });
    patch.password_hash = hashPassword(password);
  }
  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, error: "Không có thay đổi" }, { status: 400 });
  const { data, error } = await supabaseAdmin()
    .from("app_users")
    .update(patch)
    .eq("id", id)
    .select("id, accountname, email, firstname, lastname, role, created_at, updated_at")
    .single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Lỗi cập nhật" }, { status: 500 });
  return NextResponse.json({ ok: true, user: data });
}

export async function DELETE(req: Request) {
  if (!isAdmin()) return unauth();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });
  const { error } = await supabaseAdmin().from("app_users").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
