import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 300; // 5 min

// Reddit now returns HTTP 403 to requests from Vercel (and most other public
// cloud IP ranges) regardless of the User-Agent — a well-known anti-scraping
// measure in place since ~2023. meme-api.com is a free public service that
// mirrors popular meme subreddits from its own infrastructure, which Reddit
// does not block, so we use it as the primary source and fall back to Reddit
// JSON for environments that can still reach it (local dev with no cloud IP,
// self-hosted deployments on residential ranges, etc.).

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

const CURATED_SUBS = [
  "memes",
  "dankmemes",
  "wholesomememes",
  "me_irl",
  "meirl",
  "funny",
  "AdviceAnimals",
  "ComedyCemetery",
  "PhotoshopBattles",
];

function multiSubList(sub: string): string[] | null {
  if (sub === "all") return CURATED_SUBS;
  return null;
}

const UA = "web:format-box:v1.0.0";
const IMG_EXT = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i;
const VID_EXT = /\.(mp4|webm)(\?|$)/i;

// ---------- Reddit OAuth (preferred when configured) ----------
//
// Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to a Reddit "script" app
// created at https://www.reddit.com/prefs/apps. The client-credentials flow
// hits `oauth.reddit.com`, which does not share the anti-bot block that
// Reddit applies to the public JSON endpoints on cloud IP ranges.

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

async function redditOAuthToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;

  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Reddit OAuth HTTP ${res.status}`);
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Reddit OAuth: no access_token");
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return tokenCache.token;
}

async function fetchOAuth(path: string): Promise<Meme[]> {
  const token = await redditOAuthToken();
  if (!token) throw new Error("no reddit oauth creds");
  const res = await fetch(`https://oauth.reddit.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (res.status === 401) {
    tokenCache = null;
    throw new Error("reddit oauth 401");
  }
  if (!res.ok) throw new Error(`reddit oauth HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { children?: RedditChild[] } };
  return (json.data?.children ?? [])
    .map((c): Meme | null => {
      const d = c.data;
      const img = pickRedditImage(d);
      if (!img) return null;
      return {
        id: d.id,
        title: d.title,
        url: img.url,
        thumbnail: pickRedditThumb(d),
        width: img.w,
        height: img.h,
        author: d.author,
        subreddit: d.subreddit,
        score: d.score ?? 0,
        comments: d.num_comments ?? 0,
        nsfw: Boolean(d.over_18),
        spoiler: Boolean(d.spoiler),
        isVideo: Boolean(d.is_video),
        isGif: /\.gif(\?|$)/i.test(img.url),
        permalink: `https://www.reddit.com${d.permalink}`,
        createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : "",
      };
    })
    .filter((m): m is Meme => m !== null && !m.nsfw);
}

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
}

function idFromPermalink(permalink: string): string {
  const parts = permalink.replace(/\/+$/, "").split("/");
  // Reddit permalinks: /r/<sub>/comments/<id>/<slug>
  const idx = parts.indexOf("comments");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return parts.pop() || Math.random().toString(36).slice(2, 10);
}

// ---------- meme-api.com (primary) ----------

type MemeApiItem = {
  postLink: string;
  subreddit: string;
  title: string;
  url: string;
  nsfw: boolean;
  spoiler: boolean;
  author: string;
  ups?: number;
  preview?: string[];
};

const MEME_API_MAX = 50; // meme-api.com caps each response at 50 items.

async function fetchFromMemeApi(path: string): Promise<Meme[]> {
  const res = await fetch(`https://meme-api.com/gimme/${path}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`meme-api.com HTTP ${res.status}`);
  const json = (await res.json()) as { memes?: MemeApiItem[] } | MemeApiItem;
  const items: MemeApiItem[] = Array.isArray((json as { memes?: MemeApiItem[] }).memes)
    ? (json as { memes: MemeApiItem[] }).memes
    : [json as MemeApiItem];

  return items
    .filter((m) => m && m.url)
    .map((m): Meme => {
      const url = decodeHtml(m.url);
      const isVideo = VID_EXT.test(url);
      const isGif = /\.gif(\?|$)/i.test(url);
      const previews = Array.isArray(m.preview) ? m.preview.map(decodeHtml) : [];
      // Preview array is low → high. Pick a mid-size one for the grid.
      const thumb = previews[previews.length - 2] || previews[previews.length - 1] || url;
      return {
        id: idFromPermalink(m.postLink),
        title: m.title,
        url,
        thumbnail: thumb,
        width: null,
        height: null,
        author: m.author,
        subreddit: m.subreddit,
        score: m.ups ?? 0,
        comments: 0,
        nsfw: Boolean(m.nsfw),
        spoiler: Boolean(m.spoiler),
        isVideo,
        isGif,
        permalink: m.postLink,
        createdAt: "",
      };
    })
    .filter((m) => !m.nsfw);
}

// ---------- Reddit JSON (fallback) ----------

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
    };
  };
};

function pickRedditImage(c: RedditChild["data"]): { url: string; w: number | null; h: number | null } | null {
  const direct = c.url_overridden_by_dest || c.url;
  const src = c.preview?.images?.[0]?.source;
  if (direct && IMG_EXT.test(direct)) {
    return { url: direct, w: src?.width ?? null, h: src?.height ?? null };
  }
  if (src?.url) return { url: decodeHtml(src.url), w: src.width, h: src.height };
  return null;
}

function pickRedditThumb(c: RedditChild["data"]): string {
  const resolutions = c.preview?.images?.[0]?.resolutions;
  if (resolutions && resolutions.length > 0) {
    const target = resolutions.find((r) => r.width >= 320) ?? resolutions[resolutions.length - 1];
    return decodeHtml(target.url);
  }
  if (c.thumbnail && c.thumbnail.startsWith("http")) return c.thumbnail;
  const img = pickRedditImage(c);
  return img?.url ?? "";
}

async function fetchRedditJson(url: string): Promise<Meme[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { children?: RedditChild[] } };
  const children = json.data?.children ?? [];
  return children
    .map((c): Meme | null => {
      const d = c.data;
      const img = pickRedditImage(d);
      if (!img) return null;
      return {
        id: d.id,
        title: d.title,
        url: img.url,
        thumbnail: pickRedditThumb(d),
        width: img.w,
        height: img.h,
        author: d.author,
        subreddit: d.subreddit,
        score: d.score ?? 0,
        comments: d.num_comments ?? 0,
        nsfw: Boolean(d.over_18),
        spoiler: Boolean(d.spoiler),
        isVideo: Boolean(d.is_video),
        isGif: /\.gif(\?|$)/i.test(img.url),
        permalink: `https://www.reddit.com${d.permalink}`,
        createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : "",
      };
    })
    .filter((m): m is Meme => m !== null && !m.nsfw);
}

// ---------- Handler ----------

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const sub = (searchParams.get("sub") || "all").trim();
  const sort = (searchParams.get("sort") || "hot").trim();
  const t = (searchParams.get("t") || "day").trim();
  const limitRaw = Number(searchParams.get("limit") || 30);
  const limit = Math.min(Math.max(isFinite(limitRaw) ? limitRaw : 30, 5), 100);

  const errors: string[] = [];

  // Keyword search: meme-api.com has no search endpoint, so fetch a bigger
  // sample first and filter titles below. We skew `fetchSize` upward because
  // many titles won't match.
  const fetchSize = q ? Math.min(limit * 3, 100) : limit;

  const multiSubs = multiSubList(sub);

  // Pass 0 — Reddit OAuth (preferred when env vars are set; supports search,
  // sort and time-range filters properly and is not blocked on cloud IPs).
  if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) {
    try {
      let path: string;
      if (q) {
        // Reddit search accepts a comma-separated list of subs via
        // `/r/a+b+c/search`. For the global "all" case there's no restrict_sr.
        if (multiSubs) {
          const subPath = multiSubs.join("+");
          const params = new URLSearchParams({
            q,
            sort,
            t,
            limit: String(limit),
            type: "link",
            restrict_sr: "1",
            raw_json: "1",
          });
          path = sub === "all"
            ? `/search?${new URLSearchParams({ q, sort, t, limit: String(limit), type: "link", raw_json: "1" })}`
            : `/r/${subPath}/search?${params.toString()}`;
        } else {
          const params = new URLSearchParams({
            q,
            sort,
            t,
            limit: String(limit),
            type: "link",
            restrict_sr: "1",
            raw_json: "1",
          });
          path = `/r/${encodeURIComponent(sub)}/search?${params.toString()}`;
        }
        const memes = await fetchOAuth(path);
        return NextResponse.json(
          { memes, source: "reddit-oauth", sort, t, sub, q },
          { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } },
        );
      }
      if (multiSubs) {
        const perSub = Math.max(3, Math.floor(limit / multiSubs.length) + 1);
        const results = await Promise.allSettled(
          multiSubs.map((s) => fetchOAuth(`/r/${s}/${sort}?limit=${perSub}&t=${t}&raw_json=1`)),
        );
        const merged = results
          .filter((r): r is PromiseFulfilledResult<Meme[]> => r.status === "fulfilled")
          .flatMap((r) => r.value)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        if (merged.length === 0) throw new Error("reddit-oauth returned 0 memes");
        return NextResponse.json(
          { memes: merged, source: "reddit-oauth", sort, t, sub, subs: multiSubs, q },
          { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } },
        );
      }
      path = `/r/${encodeURIComponent(sub)}/${sort}?limit=${limit}&t=${t}&raw_json=1`;
      const memes = await fetchOAuth(path);
      return NextResponse.json(
        { memes, source: "reddit-oauth", sort, t, sub, q },
        { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } },
      );
    } catch (err) {
      errors.push(`reddit-oauth: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  // Pass 1 — meme-api.com (works from Vercel; the primary path when OAuth
  // is not configured).
  try {
    if (multiSubs) {
      // meme-api.com's default /gimme route pulls from wholesomememes +
      // memes + me_irl. For broader variety we call several subs in parallel
      // and merge. For `vn` the list is small so each sub gets a bigger share.
      const pickSubs = sub === "all" ? multiSubs.slice(0, 5) : multiSubs;
      const perSub = Math.min(MEME_API_MAX, Math.max(5, Math.floor(fetchSize / pickSubs.length) + 1));
      const results = await Promise.allSettled(
        pickSubs.map((s) => fetchFromMemeApi(`${encodeURIComponent(s)}/${perSub}`)),
      );
      const merged = results
        .filter((r): r is PromiseFulfilledResult<Meme[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);
      if (merged.length === 0) throw new Error("meme-api.com returned 0 memes");
      let memes = merged.sort((a, b) => b.score - a.score);
      if (q) memes = filterByQuery(memes, q);
      memes = memes.slice(0, limit);
      return NextResponse.json(
        { memes, source: "meme-api.com", sort, t, sub, subs: pickSubs, q },
        { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } },
      );
    } else {
      const perReq = Math.min(MEME_API_MAX, fetchSize);
      const path = `${encodeURIComponent(sub)}/${perReq}`;
      let memes = await fetchFromMemeApi(path);
      if (q) memes = filterByQuery(memes, q);
      memes = memes.slice(0, limit);
      return NextResponse.json(
        { memes, source: "meme-api.com", sort, t, sub, q },
        { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } },
      );
    }
  } catch (err) {
    errors.push(`meme-api.com: ${err instanceof Error ? err.message : "unknown"}`);
  }

  // Pass 2 — Reddit JSON (works from non-cloud IP ranges, e.g. local dev or
  // self-hosted). Also supports proper search, so this is the preferred path
  // when it's reachable.
  try {
    let url: string;
    if (q) {
      if (multiSubs) {
        const subPath = multiSubs.join("+");
        const params = new URLSearchParams({
          q,
          sort,
          t,
          limit: String(limit),
          type: "link",
          restrict_sr: sub === "all" ? "0" : "1",
        });
        url = sub === "all"
          ? `https://www.reddit.com/search.json?${new URLSearchParams({ q, sort, t, limit: String(limit), type: "link" })}`
          : `https://www.reddit.com/r/${subPath}/search.json?${params.toString()}`;
      } else {
        const params = new URLSearchParams({
          q,
          sort,
          t,
          limit: String(limit),
          type: "link",
          restrict_sr: "1",
        });
        url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json?${params.toString()}`;
      }
    } else if (multiSubs) {
      const perSub = Math.max(3, Math.floor(limit / multiSubs.length) + 1);
      const results = await Promise.allSettled(
        multiSubs.map((s) =>
          fetchRedditJson(`https://www.reddit.com/r/${s}/${sort}.json?limit=${perSub}&t=${t}`),
        ),
      );
      const merged = results
        .filter((r): r is PromiseFulfilledResult<Meme[]> => r.status === "fulfilled")
        .flatMap((r) => r.value)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      if (merged.length === 0) throw new Error("Reddit returned 0 memes");
      return NextResponse.json(
        { memes: merged, source: "reddit", sort, t, sub, subs: multiSubs, q },
        { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } },
      );
    } else {
      url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/${sort}.json?limit=${limit}&t=${t}`;
    }
    const memes = await fetchRedditJson(url);
    return NextResponse.json(
      { memes, source: "reddit", sort, t, sub, q },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } },
    );
  } catch (err) {
    errors.push(`reddit: ${err instanceof Error ? err.message : "unknown"}`);
  }

  return NextResponse.json(
    { memes: [], error: errors.join(" · ") },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}

function filterByQuery(memes: Meme[], q: string): Meme[] {
  const needle = q.toLowerCase();
  return memes.filter((m) => m.title.toLowerCase().includes(needle));
}
