import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400; // 1 day — image bytes don't change

// Only allow proxying from image hosts Reddit actually serves. Prevents the
// endpoint being used as an open proxy.
const ALLOWED_HOSTS = new Set([
  "i.redd.it",
  "preview.redd.it",
  "external-preview.redd.it",
  "i.imgur.com",
  "imgur.com",
  "gfycat.com",
  "giphy.com",
  "media.giphy.com",
  "i.giphy.com",
  "redgifs.com",
  "v.redd.it",
  "styles.redditmedia.com",
]);

const UA = "web:format-box:v1.0.0";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "bad scheme" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { "User-Agent": UA, Accept: "image/*,video/*,*/*;q=0.8" },
      next: { revalidate: 86400 },
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
