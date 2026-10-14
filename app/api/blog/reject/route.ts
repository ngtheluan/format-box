import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { updateLocalStatus } from "@/lib/blog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });

  await updateLocalStatus(slug, "rejected");
  return NextResponse.json({ ok: true });
}
