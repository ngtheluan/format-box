import { del, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Blob = {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
};

export async function GET(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN chưa cấu hình" }, { status: 500 });
  }
  const cursor = new URL(req.url).searchParams.get("cursor") || undefined;
  try {
    const page = await list({ prefix: "blog/", cursor, limit: 100 });
    const blobs: Blob[] = page.blobs.map((b) => ({
      url: b.url,
      pathname: b.pathname,
      size: b.size,
      uploadedAt: typeof b.uploadedAt === "string" ? b.uploadedAt : b.uploadedAt.toISOString(),
    }));
    blobs.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
    return NextResponse.json({ ok: true, blobs, cursor: page.cursor ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "list failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "Thiếu url" }, { status: 400 });
  }
  try {
    await del(url);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "delete failed" }, { status: 500 });
  }
}
