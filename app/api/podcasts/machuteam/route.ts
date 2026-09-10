import { NextRequest, NextResponse } from "next/server";

// GET /api/podcasts/machuteam?slug=ky-an-duoi-ho-sau
// Returns { audioUrl, title, img } for a given episode slug
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });

  try {
    const res = await fetch(`https://machuteam.vn/${slug}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      next: { revalidate: 86400 }, // cache 24h per episode
    });

    if (!res.ok) return NextResponse.json({ error: "not found" }, { status: 404 });

    const html = await res.text();

    // Extract from: tracks = [{ src: "...", albumArt: "...", trackTitle: "..." }]
    const srcMatch = html.match(/src:\s*"(https:\/\/machuteam\.vn\/uploads\/audio\/[^"]+)"/);
    const imgMatch = html.match(/albumArt:\s*"([^"]+)"/);
    const titleMatch = html.match(/trackTitle:\s*"([^"]+)"/);

    if (!srcMatch) return NextResponse.json({ error: "audio not found" }, { status: 404 });

    return NextResponse.json({
      audioUrl: srcMatch[1],
      img: imgMatch?.[1] ?? null,
      title: titleMatch?.[1] ?? null,
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
