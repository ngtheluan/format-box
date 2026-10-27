import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const OK_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN chưa cấu hình" }, { status: 500 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
    const contentType = file.type || "image/png";
    if (!OK_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Chỉ nhận PNG/JPEG/WEBP/GIF/AVIF" }, { status: 415 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length === 0) return NextResponse.json({ error: "File rỗng" }, { status: 400 });
    if (buf.length > MAX_BYTES) return NextResponse.json({ error: "Ảnh > 8MB" }, { status: 413 });
    const ext = (contentType.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "") || "png";
    const name = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const blob = await put(name, buf, { access: "public", contentType });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upload failed" }, { status: 500 });
  }
}
