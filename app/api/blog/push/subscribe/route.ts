import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Body;
  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Thiếu endpoint/keys" }, { status: 400 });
  }
  const ua = req.headers.get("user-agent") || "";
  try {
    const db = supabaseAdmin();
    const { error } = await db
      .from("push_subscriptions")
      .upsert(
        { endpoint, p256dh, auth, user_agent: ua.slice(0, 500), last_seen_at: new Date().toISOString() },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  const endpoint = body.endpoint?.trim();
  if (!endpoint) return NextResponse.json({ error: "Thiếu endpoint" }, { status: 400 });
  try {
    const db = supabaseAdmin();
    const { error } = await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
}
