import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { toolToRow } from "@/lib/tools";
import type { Tool } from "@/lib/tools-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  if (!isAdmin()) return unauth();
  const { data, error } = await supabaseAdmin()
    .from("tools")
    .select("*")
    .order("sort", { ascending: true })
    .order("title", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tools: data });
}

export async function POST(req: Request) {
  if (!isAdmin()) return unauth();
  const tool = (await req.json()) as Tool;
  const { error } = await supabaseAdmin().from("tools").insert(toolToRow(tool));
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("tools");
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  if (!isAdmin()) return unauth();
  const tool = (await req.json()) as Tool;
  const row = toolToRow(tool);
  const { error } = await supabaseAdmin().from("tools").upsert(row, { onConflict: "href" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("tools");
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  if (!isAdmin()) return unauth();
  const { href, ...patch } = await req.json();
  if (!href) return NextResponse.json({ ok: false, error: "missing href" }, { status: 400 });
  const { error } = await supabaseAdmin().from("tools").update(patch).eq("href", href);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("tools");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAdmin()) return unauth();
  const { href } = await req.json();
  if (!href) return NextResponse.json({ ok: false, error: "missing href" }, { status: 400 });
  const { error } = await supabaseAdmin().from("tools").delete().eq("href", href);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  revalidateTag("tools");
  return NextResponse.json({ ok: true });
}
