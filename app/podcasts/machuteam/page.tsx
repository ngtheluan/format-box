import Nav from "@/components/Nav";
import type { Metadata } from "next";
import MachuPodcast from "./MachuPodcast";
import type { Episode, Video } from "./types";

export const metadata: Metadata = {
  title: "MachuTeam Podcast — Kỳ Án & Truyện Ma",
  description: "Nghe podcast Kỳ Án từ MachuTeam",
};

async function fetchEpisodes(): Promise<Episode[]> {
  const categories = [
    "https://machuteam.vn/podcast/ki-an",
    "https://machuteam.vn/podcast/truyen",
    "https://machuteam.vn/podcast/linh-di",
  ];

  const seen = new Set<string>();
  const episodes: Episode[] = [];

  for (const url of categories) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;
      const html = await res.text();

      const parts = html.split('<div class="card"');
      for (let i = 1; i < parts.length; i++) {
        const block = parts[i];

        const linkMatch = block.match(/href="https:\/\/machuteam\.vn\/([^"?#\s]+)"/);
        const imgMatch = block.match(/src="(https:\/\/machuteam\.vn\/uploads\/images\/main_(\d+)\.[^"]+)"/);
        if (!linkMatch || !imgMatch) continue;

        const slug = linkMatch[1];
        const ts = imgMatch[2];
        if (seen.has(ts)) continue;
        seen.add(ts);

        const img = imgMatch[1];
        const text = block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

        const titleAttr = block.match(/(?:title|alt)="([^"]{5,})"(?!\s*src)/);
        const h3Match = block.match(/<h3[^>]*>([^<]+)<\/h3>/);
        const title = (h3Match?.[1] || titleAttr?.[1] || slug).trim();

        const listensMatch = text.match(/Lượt nghe[:\s]+(\d[\d\s]*)/i);
        const listens = listensMatch ? parseInt(listensMatch[1].replace(/\s/g, "")) : 0;

        const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
        const date = dateMatch ? dateMatch[1] : "";

        if (slug && ts) {
          episodes.push({ title, img, slug, ts, listens, date });
        }
      }
    } catch {
      // silently skip failed categories
    }
  }

  return episodes;
}

async function fetchVideos(): Promise<Video[]> {
  try {
    const CHANNEL_ID = "UCGQSSE5pvBxV6r7VfZbvWuQ";
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return [];

    const xml = await res.text();
    const entries = xml.split("<entry>").slice(1);

    return entries.map((entry) => {
      const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] ?? "";
      const title = (entry.match(/<title>([^<]+)<\/title>/) || [])[1]?.trim() ?? "";
      const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1] ?? "";
      const thumbMatch = entry.match(/<media:thumbnail[^>]*\surl="([^"]+)"/);
      const thumbnail = thumbMatch?.[1] ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const viewsMatch = entry.match(/views="(\d+)"/);
      const views = viewsMatch ? parseInt(viewsMatch[1]) : 0;
      const descMatch = entry.match(/<media:description>([^<]*)/);
      const description = descMatch ? descMatch[1].trim().slice(0, 150) : "";

      return { videoId, title, published, thumbnail, views, description };
    }).filter((v) => v.videoId);
  } catch {
    return [];
  }
}

export default async function Page() {
  const [episodes, videos] = await Promise.all([fetchEpisodes(), fetchVideos()]);

  return (
    <>
      <Nav />
      <MachuPodcast episodes={episodes} videos={videos} />
    </>
  );
}
