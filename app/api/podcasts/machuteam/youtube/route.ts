import { NextResponse } from "next/server";

const CHANNEL_ID = "UCGQSSE5pvBxV6r7VfZbvWuQ";
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export const revalidate = 1800; // 30 min

function extractText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`));
  return m ? m[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^>]*>`));
  return m ? m[1] : "";
}

export async function GET() {
  try {
    const res = await fetch(RSS_URL, { next: { revalidate: 1800 } });
    if (!res.ok) return NextResponse.json({ videos: [] });

    const xml = await res.text();
    const entries = xml.split("<entry>").slice(1);

    const videos = entries.map((entry) => {
      const videoId = extractText(entry, "yt:videoId");
      const title = extractText(entry, "title");
      const published = extractText(entry, "published");
      const thumbnail = extractAttr(entry, "media:thumbnail", "url");
      const viewsMatch = entry.match(/views="(\d+)"/);
      const views = viewsMatch ? parseInt(viewsMatch[1]) : 0;
      const descMatch = entry.match(/<media:description>([^<]*)/);
      const description = descMatch ? descMatch[1].trim().slice(0, 150) : "";

      return { videoId, title, published, thumbnail, views, description };
    }).filter((v) => v.videoId);

    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ videos: [] });
  }
}
