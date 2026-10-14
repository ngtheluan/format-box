import { NextResponse } from "next/server";
import { isProxyableImageHost } from "@/app/travel-plan/shared";

export const runtime = "nodejs";
export const revalidate = 86400; // 1 day — image bytes don't change

const UA = "web:format-box:v1.0.0 (travel-planner)";

// Same-origin image proxy. Lets the themed itinerary card export cleanly with
// html-to-image (no tainted canvas) and keeps hot-link-protected sources
// rendering in the public viewer. SSRF-guarded via isProxyableImageHost.
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
  if (!isProxyableImageHost(target.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { "User-Agent": UA, Accept: "image/*,*/*;q=0.8" },
      redirect: "follow",
      next: { revalidate: 86400 },
    });
    const contentType = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !upstream.body || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }
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
