import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/admin-auth";
import { deletePublished, removeLocalPost } from "@/lib/blog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });

  await removeLocalPost(slug);
  try {
    await deletePublished(slug);
  } catch {}
  // Also drop cover image if we generated one.
  try {
    await fs.unlink(path.join(process.cwd(), "public", "blog-covers", `${slug}.jpg`));
  } catch {}
  return NextResponse.json({ ok: true });
}
