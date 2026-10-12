import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { currentUserId } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function GET() {
  const id = currentUserId();
  if (!id) return NextResponse.json({ ok: false, user: null });
  try {
    const { data } = await supabaseAdmin()
      .from("app_users")
      .select("id, accountname, firstname, lastname, role")
      .eq("id", id)
      .maybeSingle();
    if (!data) return NextResponse.json({ ok: false, user: null });
    return NextResponse.json({ ok: true, user: { ...data, role: data.role === "admin" ? "admin" : "user" } });
  } catch {
    return NextResponse.json({ ok: false, user: null });
  }
}
