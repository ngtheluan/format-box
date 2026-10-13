import { isAdmin } from "@/lib/admin-auth";
import { del, list } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

const TTL_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  if (!isAdmin()) return unauth();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: "blob token missing" }, { status: 500 });
  }
  let cursor: string | undefined;
  const items: Array<{ url: string; pathname: string; size: number; uploadedAt: string; expiresAt: string }> = [];
  do {
    const page = await list({ prefix: "photobooth/", cursor, limit: 1000 });
    for (const b of page.blobs) {
      const uploadedISO = typeof b.uploadedAt === "string" ? b.uploadedAt : b.uploadedAt.toISOString();
      const uploaded = new Date(uploadedISO).getTime();
      items.push({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: uploadedISO,
        expiresAt: new Date(uploaded + TTL_MS).toISOString(),
      });
    }
    cursor = page.cursor;
  } while (cursor);
  items.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  const totalBytes = items.reduce((n, i) => n + (i.size || 0), 0);
  return NextResponse.json({ ok: true, items, totalBytes });
}

export async function DELETE(req: Request) {
  if (!isAdmin()) return unauth();
  const body = (await req.json().catch(() => ({}))) as { urls?: string[]; all?: boolean };
  if (body.all) {
    let cursor: string | undefined;
    const urls: string[] = [];
    do {
      const page = await list({ prefix: "photobooth/", cursor, limit: 1000 });
      for (const b of page.blobs) urls.push(b.url);
      cursor = page.cursor;
    } while (cursor);
    const CHUNK = 100;
    for (let i = 0; i < urls.length; i += CHUNK) await del(urls.slice(i, i + CHUNK));
    return NextResponse.json({ ok: true, deleted: urls.length });
  }
  const urls = Array.isArray(body.urls) ? body.urls.filter((u) => typeof u === "string") : [];
  if (!urls.length) return NextResponse.json({ ok: false, error: "no urls" }, { status: 400 });
  await del(urls);
  return NextResponse.json({ ok: true, deleted: urls.length });
}
