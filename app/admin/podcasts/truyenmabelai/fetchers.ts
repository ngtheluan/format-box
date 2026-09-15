import { Innertube, UniversalCache } from "youtubei.js";
import type { Episode } from "./types";

const CHANNEL_HANDLE = "truyenmabelai";

let ytPromise: Promise<Innertube> | null = null;
function getYt(): Promise<Innertube> {
  if (!ytPromise) {
    ytPromise = Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      // Force Vietnamese metadata so titles/dates don't mix between EN and VI
      // depending on YouTube's guess at the caller's locale.
      lang: "vi",
      location: "VN",
    }).catch((e) => {
      ytPromise = null;
      throw e;
    });
  }
  return ytPromise;
}

async function resolveChannelId(): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/@${CHANNEL_HANDLE}/videos`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m =
      html.match(/"externalId":"(UC[\w-]{22})"/) ||
      html.match(/"channelId":"(UC[\w-]{22})"/) ||
      html.match(/"browseId":"(UC[\w-]{22})"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function parseViews(s: string): number {
  // Handles both English ("188K views", "1.2M views") and Vietnamese
  // ("188 N lượt xem" — N = nghìn; "1,2 Tr" — Tr = triệu; "N Tỷ" — Tỷ = tỉ).
  const m = s.match(/([\d.,]+)\s*(K|M|B|N|Tr|Tỷ|Tỉ)?/i);
  if (!m) return 0;
  const num = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  const unit = m[2]?.toLowerCase();
  const mul =
    unit === "k" || unit === "n"
      ? 1e3
      : unit === "m" || unit === "tr"
        ? 1e6
        : unit === "b" || unit === "tỷ" || unit === "tỉ"
          ? 1e9
          : 1;
  return Math.round(num * mul);
}

type RichVideo = {
  content_id?: string;
  metadata?: {
    title?: { text?: string };
    metadata?: {
      metadata_rows?: Array<{
        metadata_parts?: Array<{ text?: { text?: string } }>;
        badges?: Array<{ style?: string; text?: string }>;
      }>;
    };
  };
  content_image?: {
    image?: Array<{ url?: string; width?: number; height?: number }>;
  };
};

function isMembersOnly(v: RichVideo): boolean {
  const rows = v.metadata?.metadata?.metadata_rows ?? [];
  for (const row of rows) {
    for (const b of row.badges ?? []) {
      if ((b.style ?? "").includes("MEMBERS_ONLY")) return true;
    }
  }
  return false;
}

export async function fetchEpisodes(): Promise<Episode[]> {
  try {
    const channelId = await resolveChannelId();
    if (!channelId) return [];

    const yt = await getYt();
    const channel = await yt.getChannel(channelId);
    let feed = await channel.getVideos();

    const collected: Episode[] = [];
    const seen = new Set<string>();

    const pushBatch = (items: unknown[]) => {
      for (const raw of items) {
        const v = raw as RichVideo;
        const id = v.content_id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        // Skip members-only videos — non-members can't stream them.
        if (isMembersOnly(v)) continue;

        const title = v.metadata?.title?.text ?? "";
        const parts = v.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts ?? [];
        const viewsText = parts[0]?.text?.text ?? "";
        const dateText = parts[1]?.text?.text ?? "";
        const img = v.content_image?.image?.[0]?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

        collected.push({
          title,
          img,
          slug: id,
          ts: id,
          listens: parseViews(viewsText),
          date: dateText,
        });
      }
    };

    pushBatch(feed.videos);

    // Grab a couple of continuation pages so users see more than 30 entries.
    let cursor: { videos: unknown[]; getContinuation?: () => Promise<unknown> } = feed as never;
    // Keep paging until the channel has no more videos (safety cap 50 pages ~= 1500 items).
    for (let i = 0; i < 50; i++) {
      if (typeof cursor.getContinuation !== "function") break;
      try {
        const next = (await cursor.getContinuation()) as {
          videos?: unknown[];
          getContinuation?: () => Promise<unknown>;
        };
        if (!next || !next.videos?.length) break;
        const before = collected.length;
        pushBatch(next.videos);
        cursor = next as never;
        // Stop if a page adds nothing new (dedup wall).
        if (collected.length === before) break;
      } catch {
        break;
      }
    }

    return collected;
  } catch {
    return [];
  }
}
