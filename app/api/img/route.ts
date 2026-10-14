export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Keep a tiny in-process cache so repeat requests to the same prompt skip Unsplash.
const cache = new Map<string, { url: string; at: number }>();
const TTL = 1000 * 60 * 60 * 12; // 12h

function picsum(seed: number, w: number, h: number) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

// Trim prompt → 2–5 strong keywords (drop English stopwords & punctuation).
function toQuery(prompt: string): string {
  const stop = new Set([
    "a","an","the","of","on","in","at","and","or","with","for","to","from","by","as","is","are",
    "digital","art","minimalist","modern","illustration","photo","photograph","image","scene",
    "soft","sleek","vibrant","subtle","lighting","pastel","colors","color",
  ]);
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w))
    .slice(0, 5)
    .join(" ") || prompt.slice(0, 40);
}

async function unsplash(query: string, seed: number, w: number, h: number): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const cacheKey = `u:${query}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL) {
    return `${hit.url}&w=${w}&h=${h}&fit=crop&auto=format&q=70`;
  }
  try {
    const r = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${key}` },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!r.ok) return null;
    const j: any = await r.json();
    const items: any[] = j?.results || [];
    if (!items.length) return null;
    const pick = items[seed % items.length];
    const raw: string | undefined = pick?.urls?.raw;
    if (!raw) return null;
    cache.set(cacheKey, { url: raw, at: Date.now() });
    return `${raw}&w=${w}&h=${h}&fit=crop&auto=format&q=70`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const prompt = (u.searchParams.get("prompt") || "image").slice(0, 400);
  const w = Math.min(2048, Math.max(64, Number(u.searchParams.get("w") || "1024")));
  const h = Math.min(2048, Math.max(64, Number(u.searchParams.get("h") || "576")));
  const seed = (Number(u.searchParams.get("seed") || "0") >>> 0) || hashSeed(prompt);

  const query = toQuery(prompt);
  const url = (await unsplash(query, seed, w, h)) || picsum(seed, w, h);
  return Response.redirect(url, 302);
}
