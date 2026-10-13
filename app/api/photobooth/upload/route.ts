import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { dataUrl } = (await req.json()) as { dataUrl?: string };
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "blob token missing" }, { status: 500 });
    }
    const comma = dataUrl.indexOf(",");
    const meta = dataUrl.slice(5, comma);
    const base64 = dataUrl.slice(comma + 1);
    const contentType = meta.split(";")[0] || "image/png";
    const ext = contentType.split("/")[1] || "png";
    const buf = Buffer.from(base64, "base64");
    if (buf.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "image too large (max 8MB)" }, { status: 413 });
    }
    const name = `photobooth/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const blob = await put(name, buf, { access: "public", contentType });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upload failed" }, { status: 500 });
  }
}
