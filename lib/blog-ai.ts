// Server-only helpers for the blog AI pipeline: free LLM providers (Groq, Gemini,
// Pollinations) with automatic fallback, web research, and relevance-checked images.
import { AI_MODELS, type AiProvider, type ImageCandidate } from "./blog-ai-shared";

// ================= LLM =================

export type LlmOpts = {
  provider: AiProvider;
  model?: string;
  system: string;
  user: string;
  json?: boolean;
  webSearch?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  // Long-form output (full articles): skip providers that truncate.
  long?: boolean;
};

export type LlmResult = { text: string; provider: AiProvider; model: string; searched: boolean };

export function availableProviders(): Record<AiProvider, boolean> {
  return {
    groq: !!process.env.GROQ_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    pollinations: true,
  };
}

function supportsSearch(provider: AiProvider, model: string) {
  return !!AI_MODELS[provider].find((m) => m.id === model)?.search;
}

function cleanText(s: string) {
  return s
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/【[^】]*】/g, "")
    .trim();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Parse Retry-After header (seconds or HTTP date). Returns ms, clamped to [0, 10s].
function parseRetryAfter(h: string | null): number {
  if (!h) return 0;
  const sec = Number(h);
  if (Number.isFinite(sec)) return Math.min(10_000, Math.max(0, sec * 1000));
  const date = Date.parse(h);
  if (!Number.isNaN(date)) return Math.min(10_000, Math.max(0, date - Date.now()));
  return 0;
}

async function callGroq(o: LlmOpts, model: string, search: boolean): Promise<string> {
  const build = (useSearch: boolean) => {
    const body: Record<string, unknown> = {
      model,
      temperature: o.temperature ?? 0.7,
      messages: [
        { role: "system", content: o.system },
        { role: "user", content: o.user },
      ],
    };
    const maxTokGroq = o.maxTokens ?? (o.long ? 8000 : undefined);
    if (maxTokGroq) body.max_completion_tokens = maxTokGroq;
    if (useSearch) body.tools = [{ type: "browser_search" }];
    else if (o.json) body.response_format = { type: "json_object" };
    return body;
  };
  const call = async (useSearch: boolean) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify(build(useSearch)),
        signal: AbortSignal.timeout(o.timeoutMs ?? 150_000),
      });
      if (r.ok) {
        const j: any = await r.json();
        if (o.long && j?.choices?.[0]?.finish_reason === "length") throw new Error(`Groq bị cắt (max_tokens)`);
        return j?.choices?.[0]?.message?.content ?? "";
      }
      const txt = (await r.text()).slice(0, 400);
      if (useSearch && /tool_use_failed|Failed to parse tool call/i.test(txt)) return null;
      if ((r.status === 429 || r.status === 503) && attempt < 2) {
        const wait = parseRetryAfter(r.headers.get("retry-after")) || 500 * Math.pow(2, attempt);
        await sleep(wait);
        continue;
      }
      throw new Error(`Groq ${r.status}: ${txt.slice(0, 240)}`);
    }
    return "";
  };
  let out = await call(search);
  if (out === null) out = await call(false);
  return out ?? "";
}

async function callGemini(o: LlmOpts, model: string, search: boolean): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY || "")}`;
  const generationConfig: Record<string, unknown> = { temperature: o.temperature ?? 0.7 };
  const maxTokGem = o.maxTokens ?? (o.long ? 8000 : undefined);
  if (maxTokGem) generationConfig.maxOutputTokens = maxTokGem;
  if (o.json && !search) generationConfig.responseMimeType = "application/json";
  const body = JSON.stringify({
    systemInstruction: { role: "system", parts: [{ text: o.system }] },
    contents: [{ role: "user", parts: [{ text: o.user }] }],
    generationConfig,
    ...(search ? { tools: [{ google_search: {} }] } : {}),
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(o.timeoutMs ?? 150_000),
    });
    if (r.ok) {
      const j: any = await r.json();
      const parts = j?.candidates?.[0]?.content?.parts;
      return Array.isArray(parts) ? parts.map((p: any) => p?.text || "").join("") : "";
    }
    const txt = (await r.text()).slice(0, 240);
    if ((r.status === 429 || r.status === 503) && attempt < 2) {
      const wait = parseRetryAfter(r.headers.get("retry-after")) || 800 * Math.pow(2, attempt);
      await sleep(wait);
      continue;
    }
    throw new Error(`Gemini ${r.status}: ${txt}`);
  }
  return "";
}

// Anonymous tier: ~1500 completion tokens and 1 reply / 30s per IP — fine for small
// tasks (ideas, image judging, rewriting a paragraph), too short for full articles.
async function callPollinations(o: LlmOpts, model: string): Promise<string> {
  const r = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: o.system },
        { role: "user", content: o.user },
      ],
    }),
    signal: AbortSignal.timeout(o.timeoutMs ?? 150_000),
  });
  if (!r.ok) throw new Error(`Pollinations ${r.status}: ${(await r.text()).slice(0, 240)}`);
  const j: any = await r.json();
  if (o.long && j?.choices?.[0]?.finish_reason === "length") {
    throw new Error("Pollinations giới hạn độ dài — bài bị cắt, hãy dùng Groq/Gemini");
  }
  return j?.choices?.[0]?.message?.content ?? "";
}

async function callOnce(o: LlmOpts, provider: AiProvider, model: string): Promise<LlmResult> {
  const search = !!o.webSearch && supportsSearch(provider, model);
  let raw: string;
  if (provider === "groq") raw = await callGroq(o, model, search);
  else if (provider === "gemini") raw = await callGemini(o, model, search);
  else raw = await callPollinations(o, model);
  const text = cleanText(raw);
  if (!text) throw new Error(`${provider} trả về rỗng`);
  return { text, provider, model, searched: search };
}

// Try the requested model, then the provider's other models (separate free quotas),
// then the other configured providers. Stops early once the time budget is spent.
export async function callLlm(o: LlmOpts): Promise<LlmResult> {
  const avail = availableProviders();
  const models = (p: AiProvider) =>
    o.webSearch ? [...AI_MODELS[p]].sort((a, b) => Number(!!b.search) - Number(!!a.search)) : AI_MODELS[p];
  const chain: [AiProvider, string][] = [];
  const push = (p: AiProvider, m: string) => {
    if (avail[p] && !chain.some(([a, b]) => a === p && b === m)) chain.push([p, m]);
  };
  push(o.provider, o.model || models(o.provider)[0].id);
  for (const m of models(o.provider)) push(o.provider, m.id);
  // Try providers in order of generation quality / cost efficiency.
  for (const p of ["groq", "gemini", "pollinations"] as AiProvider[]) {
    if (p === o.provider || (o.long && p === "pollinations")) continue;
    for (const m of models(p)) push(p, m.id);
  }

  const started = Date.now();
  const budget = Math.max(o.timeoutMs ?? 150_000, 60_000) * 1.5;
  const errors: string[] = [];
  for (const [p, m] of chain) {
    if (Date.now() - started > budget) break;
    try {
      return await callOnce(o, p, m);
    } catch (e: any) {
      errors.push(`${m}: ${(e?.message || String(e)).slice(0, 160)}`);
    }
  }
  throw new Error(errors.join(" · ") || "Không có AI provider khả dụng");
}

export function parseJsonLoose<T = any>(text: string): T | null {
  const s = text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(s);
  } catch {}
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch {}
  }
  return null;
}

// ================= Research =================

export async function researchTopic(
  topic: string,
  opts: { provider: AiProvider; model?: string },
): Promise<{ notes: string; searched: boolean; provider: AiProvider }> {
  const today = new Date().toISOString().slice(0, 10);
  // Browser search burns many tokens; default Groq research to the 20B model so the
  // 120B daily quota stays available for writing.
  const r = await callLlm({
    provider: opts.provider,
    model: opts.provider === "groq" && (!opts.model || opts.model === "openai/gpt-oss-120b") ? "openai/gpt-oss-20b" : opts.model,
    webSearch: true,
    temperature: 0.2,
    timeoutMs: 90_000,
    system:
      "You are a meticulous research assistant. Search the web, then write concise research notes in Vietnamese. Only include facts you found in sources. Never invent numbers, versions or quotes.",
    user: `Hôm nay là ${today}. Nghiên cứu chủ đề sau để chuẩn bị viết một bài blog chính xác, cập nhật:
"${topic}"

Trả về ghi chú dạng:
FACTS:
- 8–14 gạch đầu dòng: dữ kiện, phiên bản, ngày phát hành, số liệu, khái niệm cốt lõi, lỗi thường gặp, best practice (ngắn gọn).
SOURCES:
- Tiêu đề nguồn | https://url-that-you-actually-visited
(3–6 nguồn uy tín, ưu tiên tài liệu chính thức)`,
  });
  return { notes: r.text.slice(0, 6000), searched: r.searched, provider: r.provider };
}

// ================= Images =================

const STOP = new Set(
  "a an the of on in at and or with for to from by as is are digital art minimalist modern illustration photo photograph image scene soft sleek vibrant subtle lighting pastel colors color concept abstract futuristic background style render 3d editorial".split(
    " ",
  ),
);

export function toQuery(prompt: string, max = 5): string {
  return (
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .slice(0, max)
      .join(" ") || prompt.slice(0, 40)
  );
}

function tokens(s: string): string[] {
  return toQuery(s, 40).split(" ").filter(Boolean);
}

function lexicalScore(query: string, c: ImageCandidate): number {
  const q = tokens(query);
  if (!q.length) return 0;
  const hay = ` ${c.alt.toLowerCase()} `;
  return q.reduce((s, t) => s + (hay.includes(t) ? 1 : hay.includes(t.slice(0, -1)) ? 0.6 : 0), 0) / q.length;
}

const UTM = "utm_source=formatbox&utm_medium=referral";

export async function searchUnsplash(query: string, perPage = 12, page = 1): Promise<ImageCandidate[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !query.trim()) return [];
  try {
    const r = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) return [];
    const j: any = await r.json();
    return ((j?.results || []) as any[])
      .filter((p) => p?.urls?.raw)
      .map((p) => ({
        id: `u:${p.id}`,
        url: `${p.urls.raw}&w=1200&h=675&fit=crop&crop=entropy&auto=format&q=75`,
        thumb: `${p.urls.raw}&w=400&h=225&fit=crop&auto=format&q=60`,
        alt: [p.alt_description, p.description, ...(p.tags || []).map((t: any) => t?.title)]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 220),
        credit: p.user?.name || "Unsplash",
        creditUrl: `${p.user?.links?.html || "https://unsplash.com"}?${UTM}`,
        source: "unsplash" as const,
        downloadLocation: p.links?.download_location,
      }));
  } catch {
    return [];
  }
}

export async function searchOpenverse(query: string, n = 12, page = 1): Promise<ImageCandidate[]> {
  if (!query.trim()) return [];
  try {
    // Openverse CC search is heavy (10–14s typical), but Promise.all waits for the
    // slowest lane, so an 18s cap blocked every slot by that long. 9s drops stragglers
    // while still catching most results — the other three lanes keep the pool full.
    const r = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${n}&page=${page}&aspect_ratio=wide&mature=false`,
      { signal: AbortSignal.timeout(9000), headers: { "User-Agent": "FormatBox/1.0 (blog image search)" } },
    );
    if (!r.ok) return [];
    const j: any = await r.json();
    return ((j?.results || []) as any[])
      .filter((p) => p?.url && /^https:/.test(p.url))
      .map((p) => ({
        id: `o:${p.id}`,
        url: p.url,
        thumb: p.thumbnail || p.url,
        alt: [p.title, ...(p.tags || []).slice(0, 6).map((t: any) => t?.name)].filter(Boolean).join(" · ").slice(0, 220),
        credit: p.creator || p.source || "Openverse",
        creditUrl: p.foreign_landing_url || p.creator_url || "https://openverse.org",
        source: "openverse" as const,
        license: p.license ? `CC ${String(p.license).toUpperCase()}` : undefined,
      }));
  } catch {
    return [];
  }
}

export async function searchPexels(query: string, perPage = 12, page = 1): Promise<ImageCandidate[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query.trim()) return [];
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) return [];
    const j: any = await r.json();
    return ((j?.photos || []) as any[])
      .filter((p) => p?.src?.large2x)
      .map((p) => ({
        id: `p:${p.id}`,
        url: p.src.large2x,
        thumb: p.src.medium || p.src.small,
        alt: (p.alt || "").slice(0, 220),
        credit: p.photographer || "Pexels",
        creditUrl: `${p.photographer_url || p.url}?${UTM}`,
        source: "pexels" as const,
      }));
  } catch {
    return [];
  }
}

export async function searchWikimedia(query: string, n = 12, _page = 1): Promise<ImageCandidate[]> {
  if (!query.trim()) return [];
  try {
    const r = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(
        `filetype:bitmap ${query}`,
      )}&gsrnamespace=6&gsrlimit=${n}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1200`,
      { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "FormatBox/1.0 (blog image search)" } },
    );
    if (!r.ok) return [];
    const j: any = await r.json();
    const pages = Object.values(j?.query?.pages || {}) as any[];
    return pages
      .filter((p) => {
        const info = p?.imageinfo?.[0];
        return info?.thumburl && Number(info.width || 0) >= 800;
      })
      .map((p) => {
        const info = p.imageinfo[0];
        const meta = info.extmetadata || {};
        const artist = (meta.Artist?.value || "").replace(/<[^>]+>/g, "").trim() || "Wikimedia";
        const license = (meta.LicenseShortName?.value || "").replace(/<[^>]+>/g, "").trim();
        // Use the exact thumbnail URL returned by Commons. Rewriting its pixel
        // size can request a rendition larger than the source (for example,
        // turning an 800px image into a nonexistent 1200px thumbnail).
        const thumb = String(info.thumburl || "").replace(
          /^https?:\/\/thumb\.wikimedia\.org(?=\/)/i,
          "https://upload.wikimedia.org",
        );
        return {
          id: `w:${p.pageid}`,
          url: thumb,
          thumb,
          alt: (p.title || "").replace(/^File:/, "").replace(/\.[a-z]+$/i, "").slice(0, 220),
          credit: artist.slice(0, 60),
          creditUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
          source: "wikimedia" as const,
          license: license ? license.toUpperCase() : undefined,
        };
      });
  } catch {
    return [];
  }
}

// Round-robin across sources so one dry source doesn't crowd out better ones.
export async function searchImages(query: string, n = 12, page = 1): Promise<ImageCandidate[]> {
  const per = Math.ceil(n / 2) + 2;
  const [u, p, w, o] = await Promise.all([
    searchUnsplash(query, per, page),
    searchPexels(query, per, page),
    searchWikimedia(query, per, page),
    searchOpenverse(query, per, page),
  ]);
  const out: ImageCandidate[] = [];
  const seen = new Set<string>();
  const lanes = [u, p, w, o];
  for (let i = 0; out.length < n && i < per * lanes.length; i++) {
    const list = lanes[i % lanes.length];
    const c = list[Math.floor(i / lanes.length)];
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

export function trackImageUse(c: Pick<ImageCandidate, "source" | "downloadLocation">) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (c.source !== "unsplash" || !c.downloadLocation || !key) return Promise.resolve();
  return fetch(c.downloadLocation, { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(5000) })
    .then(() => undefined)
    .catch(() => undefined);
}

export function imageCaption(c: ImageCandidate): string {
  const name = c.credit.replace(/[[\]]/g, "");
  const srcLabel: Record<ImageCandidate["source"], string> = {
    unsplash: "Unsplash",
    pexels: "Pexels",
    wikimedia: "Wikimedia Commons",
    openverse: "Openverse",
    pollinations: "Pollinations AI",
  };
  const src = c.license ? `${c.license} · ${srcLabel[c.source]}` : srcLabel[c.source];
  return `*Ảnh: [${name}](${c.creditUrl}) / ${src}*`;
}

// Fallback: AI-generated image from Pollinations (no key, deterministic by seed).
export function pollinationsFallback(prompt: string, w = 1200, h = 675): ImageCandidate {
  const clean = prompt.replace(/[^\p{L}\p{N}\s,-]/gu, " ").trim().slice(0, 200) || "abstract gradient";
  const enc = encodeURIComponent(clean);
  const seed = Math.abs(clean.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0));
  const base = `https://image.pollinations.ai/prompt/${enc}?seed=${seed}&nologo=true&enhance=true`;
  return {
    id: `pol:${seed}`,
    url: `${base}&width=${w}&height=${h}`,
    thumb: `${base}&width=400&height=225`,
    alt: clean,
    credit: "Pollinations AI",
    creditUrl: "https://pollinations.ai",
    source: "pollinations",
  };
}

// A query is usable for stock-photo search only if it's ASCII English (Vietnamese
// diacritics or Vietnamese words return irrelevant results on Unsplash/Pexels).
export function isAsciiQuery(s: string): boolean {
  const t = (s || "").trim();
  if (!t) return false;
  if (!/^[\x20-\x7e]+$/.test(t)) return false;
  // Reject pure numbers / junk.
  return /[a-z]{3,}/i.test(t);
}

// Ask the LLM to turn a Vietnamese topic / alt text into a concrete English photo
// search query. Falls back to the input if the call fails.
export async function translatePhotoQuery(
  vn: string,
  ctx: { title: string; provider: AiProvider; context?: string },
): Promise<string> {
  const input = (vn || "").trim();
  if (!input) return "";
  if (isAsciiQuery(input)) return input;
  try {
    const r = await callLlm({
      provider: ctx.provider === "pollinations" ? "groq" : ctx.provider,
      json: true,
      temperature: 0,
      timeoutMs: 25_000,
      system:
        "You turn Vietnamese topics into a short English stock-photo search query. Reply JSON only. Rules: 2-5 words, concrete nouns a camera can capture (people doing things, physical objects, places), no abstract words (concept, abstract, futuristic, digital art), no brand names unless central, no words with multiple meanings that lead to wrong photos (bug=insect, python=snake, cloud=sky, docker=cargo ship, apple=fruit) — use their contextual meaning instead.",
      user: `Bài: "${ctx.title}"${ctx.context ? `\nNgữ cảnh: ${ctx.context.slice(0, 200)}` : ""}\nCần query ảnh cho: "${input}"\n\nJSON: {"q":"english query"}`,
    });
    const j = parseJsonLoose<{ q?: string }>(r.text);
    const q = (j?.q || "").trim();
    return isAsciiQuery(q) ? q : "";
  } catch {
    return "";
  }
}

// Batch-translate several Vietnamese slot queries into English in a single LLM call,
// saving N-1 round-trips compared to translating each slot separately.
export async function translatePhotoQueriesBatch(
  slots: { key: string; query: string; alt: string; context?: string }[],
  ctx: { title: string; provider: AiProvider },
): Promise<Record<string, string>> {
  const need = slots.filter((s) => s.query && !isAsciiQuery(s.query));
  if (!need.length) return {};
  try {
    const listing = need
      .map((s) => `- ${s.key}: query="${s.query}" alt="${s.alt}"${s.context ? ` ctx="${s.context.slice(0, 120)}"` : ""}`)
      .join("\n");
    const r = await callLlm({
      provider: ctx.provider === "pollinations" ? "groq" : ctx.provider,
      json: true,
      temperature: 0,
      timeoutMs: 30_000,
      system:
        "You turn Vietnamese topics into short English stock-photo search queries. Reply JSON only. Rules per query: 2-5 words, concrete nouns a camera can capture (people doing things, physical objects, places), no abstract words (concept, abstract, futuristic, digital art), no brand names unless central, no words with multiple meanings that lead to wrong photos (bug=insect, python=snake, cloud=sky, docker=cargo ship, apple=fruit) — use the contextual meaning instead.",
      user: `Bài: "${ctx.title}"\nCần query ảnh cho các slot sau:\n${listing}\n\nJSON: {"queries": {"<slot-key>": "english query"}}`,
    });
    const j = parseJsonLoose<{ queries?: Record<string, string> }>(r.text);
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(j?.queries || {})) {
      const q = String(v || "").trim();
      if (isAsciiQuery(q)) out[k] = q;
    }
    return out;
  } catch {
    return {};
  }
}

export type ImageSlot = { key: string; query: string; alt: string; context: string };

// Find a relevant photo for each slot: search → LLM picks the best match (or proposes
// a better query when nothing fits) → lexical fallback. Never reuses the same photo.
export async function pickImages(
  slots: ImageSlot[],
  ctx: { title: string; provider: AiProvider },
): Promise<Record<string, ImageCandidate | null>> {
  const out: Record<string, ImageCandidate | null> = {};
  if (!slots.length) return out;

  const pools = await Promise.all(
    slots.map(async (s) => {
      let list = await searchImages(s.query, 10);
      if (list.length < 3) {
        const short = s.query.split(/\s+/).slice(0, 2).join(" ");
        if (short && short !== s.query) list = [...list, ...(await searchImages(short, 8))];
      }
      return list.slice(0, 10);
    }),
  );

  let picks: Record<string, number> = {};
  let retry: Record<string, string> = {};
  try {
    const listing = slots
      .map(
        (s, i) =>
          `### ${s.key}\nNgữ cảnh: ${s.context.slice(0, 160)}\nMô tả ảnh cần: ${s.alt}\nỨng viên:\n${
            pools[i].map((c, k) => `${k}: ${c.alt || "(không mô tả)"}`).join("\n") || "(trống)"
          }`,
      )
      .join("\n\n");
    const r = await callLlm({
      provider: ctx.provider === "pollinations" ? "groq" : ctx.provider,
      json: true,
      temperature: 0,
      timeoutMs: 60_000,
      system:
        "You are a strict photo editor for a Vietnamese tech/food blog. For each slot pick the candidate whose literal visual content fits the article and the slot context. Judge the meaning in context, not keyword overlap: reject photos that only share a word with another meaning (software 'bug' is NOT an insect, 'docker containers' are NOT cargo ships, 'python' is NOT a snake, 'cloud' computing is NOT the sky, 'apple' the company is NOT fruit). If a reader would find the photo off-topic or funny, answer -1 and suggest a better query. Each candidate may be used at most once. Reply JSON only.",
      user: `Bài viết: "${ctx.title}"\n\n${listing}\n\nTrả về JSON: {"picks": {"<slot>": <index hoặc -1 nếu không ảnh nào phù hợp>}, "retry": {"<slot có -1>": "<truy vấn tiếng Anh 2-4 từ, cụ thể, chụp được bằng máy ảnh>"}}`,
    });
    const j = parseJsonLoose<{ picks?: Record<string, number>; retry?: Record<string, string> }>(r.text);
    picks = j?.picks || {};
    retry = j?.retry || {};
  } catch {
    // LLM unavailable → lexical ranking below.
  }

  const used = new Set<string>();
  const take = (c: ImageCandidate | undefined | null) => {
    if (!c || used.has(c.id)) return null;
    used.add(c.id);
    return c;
  };
  const bestLexical = (q: string, list: ImageCandidate[], min: number) =>
    list
      .filter((c) => !used.has(c.id))
      .map((c) => ({ c, s: lexicalScore(q, c) }))
      .sort((a, b) => b.s - a.s)
      .find((x) => x.s >= min)?.c;

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const idx = picks[s.key];
    if (typeof idx === "number" && idx >= 0) out[s.key] = take(pools[i][idx]);
    else if (!(s.key in picks)) out[s.key] = take(bestLexical(s.query, pools[i], 0.34));
    else out[s.key] = null;
  }

  // Second round for rejected slots with the LLM's better query.
  await Promise.all(
    slots.map(async (s) => {
      if (out[s.key]) return;
      const q = retry[s.key]?.trim();
      if (!q) return;
      const list = await searchImages(q, 8);
      out[s.key] = take(bestLexical(q, list, 0.5) || list.find((c) => !used.has(c.id)));
    }),
  );

  // Guarantee an image for every slot (cover must always have one). Prefer the
  // English search query over the Vietnamese alt so Pollinations renders a photo
  // that actually matches the topic.
  for (const s of slots) {
    if (!out[s.key]) {
      const prompt = isAsciiQuery(s.query) ? s.query : `${s.alt || ctx.title}`;
      out[s.key] = pollinationsFallback(prompt);
    }
  }

  await Promise.all(Object.values(out).map((c) => (c ? trackImageUse(c) : undefined)));
  return out;
}
