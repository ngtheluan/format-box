import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 300; // 5 min

// Reddit's public JSON feeds — no auth, no key, free. These are where viral
// content from Facebook, Instagram, Threads and TikTok typically ends up (or
// originates), so they're the most practical "cross-platform meme" source.
const CURATED_SUBS = [
  "memes",
  "dankmemes",
  "wholesomememes",
  "me_irl",
  "meirl",
  "funny",
  "AdviceAnimals",
  "ComedyCemetery",
  "memesVN",
  "PhotoshopBattles",
];

// Reddit's public JSON API rejects generic browser user-agents to curb
// scraping. Their guideline is a unique app identifier of the form
// `<platform>:<app>:<version>` — Chrome-impersonating UAs now get 403.
const UA = "web:format-box:v1.0.0";

type Meme = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  width: number | null;
  height: number | null;
  author: string;
  subreddit: string;
  score: number;
  comments: number;
  nsfw: boolean;
  spoiler: boolean;
  isVideo: boolean;
  isGif: boolean;
  permalink: string;
  createdAt: string;
};

type RedditChild = {
  kind: string;
  data: {
    id: string;
    title: string;
    author: string;
    subreddit: string;
    permalink: string;
    url: string;
    url_overridden_by_dest?: string;
    thumbnail?: string;
    post_hint?: string;
    is_video?: boolean;
    over_18?: boolean;
    spoiler?: boolean;
    score?: number;
    num_comments?: number;
    created_utc?: number;
    preview?: {
      images?: Array<{
        source?: { url: string; width: number; height: number };
        resolutions?: Array<{ url: string; width: number; height: number }>;
      }>;
      reddit_video_preview?: { fallback_url: string };
    };
    media?: {
      reddit_video?: { fallback_url: string; width: number; height: number };
    };
  };
};

const IMG_EXT = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i;

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
}

function pickImage(c: RedditChild["data"]): { url: string; w: number | null; h: number | null } | null {
  const direct = c.url_overridden_by_dest || c.url;
  const src = c.preview?.images?.[0]?.source;

  // Direct image link (i.redd.it, i.imgur.com, …).
  if (direct && IMG_EXT.test(direct)) {
    return {
      url: direct,
      w: src?.width ?? null,
      h: src?.height ?? null,
    };
  }

  // Reddit-hosted preview (used when `url` is a gallery link, i.imgur.com page, …).
  if (src?.url) {
    return { url: decodeHtml(src.url), w: src.width, h: src.height };
  }

  return null;
}

function pickThumb(c: RedditChild["data"]): string {
  const resolutions = c.preview?.images?.[0]?.resolutions;
  if (resolutions && resolutions.length > 0) {
    // Pick a mid-size preview to keep the grid snappy.
    const target = resolutions.find((r) => r.width >= 320) ?? resolutions[resolutions.length - 1];
    return decodeHtml(target.url);
  }
  if (c.thumbnail && c.thumbnail.startsWith("http")) return c.thumbnail;
  const img = pickImage(c);
  return img?.url ?? "";
}

async function fetchReddit(url: string): Promise<RedditChild[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { children?: RedditChild[] } };
  return json.data?.children ?? [];
}

function toMeme(c: RedditChild): Meme | null {
  const d = c.data;
  const img = pickImage(d);
  if (!img) return null;

  const isVideo = Boolean(d.is_video);
  const isGif = /\.gif(\?|$)/i.test(img.url);

  return {
    id: d.id,
    title: d.title,
    url: img.url,
    thumbnail: pickThumb(d),
    width: img.w,
    height: img.h,
    author: d.author,
    subreddit: d.subreddit,
    score: d.score ?? 0,
    comments: d.num_comments ?? 0,
    nsfw: Boolean(d.over_18),
    spoiler: Boolean(d.spoiler),
    isVideo,
    isGif,
    permalink: `https://www.reddit.com${d.permalink}`,
    createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : "",
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const sub = (searchParams.get("sub") || "").trim() || "all";
  const sort = (searchParams.get("sort") || "hot").trim(); // hot, new, top, rising
  const t = (searchParams.get("t") || "day").trim(); // hour, day, week, month, year, all
  const limitRaw = Number(searchParams.get("limit") || 30);
  const limit = Math.min(Math.max(isFinite(limitRaw) ? limitRaw : 30, 5), 100);

  try {
    let url: string;
    if (q) {
      // Search within a subreddit (or site-wide when sub=all).
      const base =
        sub === "all"
          ? "https://www.reddit.com/search.json"
          : `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json`;
      const params = new URLSearchParams({
        q,
        sort,
        t,
        limit: String(limit),
        type: "link",
        restrict_sr: sub === "all" ? "0" : "1",
      });
      url = `${base}?${params.toString()}`;
    } else if (sub === "all") {
      // No query, no sub → curated multi-sub feed, 1 page per sub.
      const perSub = Math.max(3, Math.floor(limit / CURATED_SUBS.length) + 1);
      const results = await Promise.allSettled(
        CURATED_SUBS.map((s) =>
          fetchReddit(`https://www.reddit.com/r/${s}/${sort}.json?limit=${perSub}&t=${t}`),
        ),
      );
      const children = results
        .filter((r): r is PromiseFulfilledResult<RedditChild[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);
      const memes = children
        .map(toMeme)
        .filter((m): m is Meme => m !== null && !m.nsfw)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      return NextResponse.json(
        { memes, source: "reddit", sort, t, subs: CURATED_SUBS },
        { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } },
      );
    } else {
      url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/${sort}.json?limit=${limit}&t=${t}`;
    }

    const children = await fetchReddit(url);
    const memes = children.map(toMeme).filter((m): m is Meme => m !== null && !m.nsfw);
    return NextResponse.json(
      { memes, source: "reddit", sort, t, sub, q },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { memes: [], error: msg },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
