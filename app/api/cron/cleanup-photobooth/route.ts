import { del, list } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  // Vercel cron sends: Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization") || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: "blob token missing" }, { status: 500 });
  }

  const cutoff = Date.now() - TTL_MS;
  let cursor: string | undefined;
  const toDelete: string[] = [];
  do {
    const page = await list({ prefix: "photobooth/", cursor, limit: 1000 });
    for (const b of page.blobs) {
      const iso = typeof b.uploadedAt === "string" ? b.uploadedAt : b.uploadedAt.toISOString();
      if (new Date(iso).getTime() < cutoff) toDelete.push(b.url);
    }
    cursor = page.cursor;
  } while (cursor);

  // del() accepts batch; chunk to be safe
  const CHUNK = 100;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    await del(toDelete.slice(i, i + CHUNK));
  }
  return NextResponse.json({ ok: true, deleted: toDelete.length });
}
