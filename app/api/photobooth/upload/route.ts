import { del, list, put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TTL_MS = 24 * 60 * 60 * 1000;

// Opportunistic cleanup: Vercel Blob public links never expire on their own — a shared
// link keeps working until the file is actually deleted. The daily cron is only a backstop
// (Hobby plan allows at most one cron/day), so we also sweep expired strips here on each
// upload. That way, during normal use, expired links stop working close to the 24h TTL.
// Best-effort: it must never make the upload itself fail.
async function sweepExpired() {
  try {
    const cutoff = Date.now() - TTL_MS;
    const expired: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await list({ prefix: "photobooth/", cursor, limit: 1000 });
      for (const b of page.blobs) {
        const iso = typeof b.uploadedAt === "string" ? b.uploadedAt : b.uploadedAt.toISOString();
        if (new Date(iso).getTime() < cutoff) expired.push(b.url);
      }
      cursor = page.cursor;
    } while (cursor && ++pages < 5); // bound the work on the hot path
    for (let i = 0; i < expired.length; i += 100) await del(expired.slice(i, i + 100));
  } catch {
    // ignore — cleanup is best-effort
  }
}

// Accepts the finished strip as a raw binary image body (e.g. image/jpeg) — not a
// base64 data URL inside JSON — so the payload stays small and well under the
// serverless request-body limit. Falls back to the legacy JSON { dataUrl } shape.
export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "blob token missing" }, { status: 500 });
    }

    const reqType = (req.headers.get("content-type") || "").split(";")[0].trim();
    let buf: Buffer;
    let contentType: string;

    if (reqType.startsWith("image/")) {
      // Preferred path: raw binary image.
      contentType = reqType;
      buf = Buffer.from(await req.arrayBuffer());
    } else {
      // Legacy path: JSON { dataUrl: "data:image/...;base64,..." }.
      const { dataUrl } = (await req.json().catch(() => ({}))) as { dataUrl?: string };
      if (!dataUrl || !dataUrl.startsWith("data:image/")) {
        return NextResponse.json({ error: "invalid payload" }, { status: 400 });
      }
      const comma = dataUrl.indexOf(",");
      contentType = dataUrl.slice(5, comma).split(";")[0] || "image/png";
      buf = Buffer.from(dataUrl.slice(comma + 1), "base64");
    }

    if (buf.length === 0) {
      return NextResponse.json({ error: "empty image" }, { status: 400 });
    }
    if (buf.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "image too large (max 8MB)" }, { status: 413 });
    }

    const ext = (contentType.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "") || "png";
    const name = `photobooth/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const blob = await put(name, buf, { access: "public", contentType });
    await sweepExpired(); // purge anything already past its 24h TTL
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upload failed" }, { status: 500 });
  }
}
