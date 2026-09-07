export type GoldItem = {
  name: string; // e.g. "SJC 1L, 10L, 1KG"
  branch?: string; // e.g. "Hồ Chí Minh"
  karat?: string; // e.g. "SJC", "24k", "18k"
  buy: number; // VND per lượng
  sell: number; // VND per lượng
};

export type GoldSnapshot = {
  source: "sjc" | "fallback";
  sourceUrl?: string;
  updatedAt?: string; // ISO — from provider
  fetchedAt: string; // ISO — when we pulled it
  items: GoldItem[];
  note?: string;
};

// Vietnamese gold quotes are quoted per "lượng" (~37.5 g) in VND.
// Prices commonly land in [40M, 200M] VND — we clamp to that to reject noise.
const MIN_PRICE = 40_000_000;
const MAX_PRICE = 300_000_000;

function toNumber(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return NaN;
  // Handle "119.000.000", "119,000,000", "119000000", "119000" (thousand shortform)
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return NaN;
  let n = Number(cleaned);
  // Some feeds give the price in thousands (e.g. "119000" for 119.000.000)
  if (n > 0 && n < MIN_PRICE / 1000) return NaN;
  if (n < MIN_PRICE && n * 1000 <= MAX_PRICE) n = n * 1000;
  return n;
}

// Parse SJC-style XML. Handles both attribute-based and element-based item shapes.
export function parseSjcXml(xml: string): { items: GoldItem[]; updatedAt?: string } {
  const items: GoldItem[] = [];
  let updatedAt: string | undefined;

  // Try to find a top-level updated timestamp
  const upMatch =
    /updated\s*=\s*"([^"]+)"/i.exec(xml) ||
    /<updated>([^<]+)<\/updated>/i.exec(xml) ||
    /date\s*=\s*"([^"]+)"[^>]*time\s*=\s*"([^"]+)"/i.exec(xml);
  if (upMatch) {
    const raw = upMatch[2] ? `${upMatch[1]} ${upMatch[2]}` : upMatch[1];
    // Try common VN formats: "dd/mm/yyyy hh:mm" or ISO
    const iso = tryParseVnDate(raw);
    if (iso) updatedAt = iso;
  }

  // Walk <city name="..."> blocks
  const cityRe = /<city\b[^>]*\bname\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/city>/gi;
  let cm: RegExpExecArray | null;
  while ((cm = cityRe.exec(xml)) !== null) {
    const branch = decodeEntities(cm[1]);
    const inner = cm[2];
    const itemRe =
      /<item\b([^>]*?)(?:\/>|>([\s\S]*?)<\/item>)/gi;
    let im: RegExpExecArray | null;
    while ((im = itemRe.exec(inner)) !== null) {
      const attrs = im[1];
      const body = im[2] ?? "";
      const name =
        attr(attrs, "type") ??
        attr(attrs, "name") ??
        tag(body, "name") ??
        tag(body, "type");
      const buy = toNumber(attr(attrs, "buy") ?? tag(body, "buy") ?? "");
      const sell = toNumber(attr(attrs, "sell") ?? tag(body, "sell") ?? "");
      if (!name || !Number.isFinite(buy) || !Number.isFinite(sell)) continue;
      if (buy < MIN_PRICE || sell < MIN_PRICE || buy > MAX_PRICE || sell > MAX_PRICE) continue;
      items.push({ name: decodeEntities(name), branch, buy, sell });
    }
  }

  // Fallback: <row> shape used by some SJC endpoints
  if (items.length === 0) {
    const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(xml)) !== null) {
      const attrs = rm[1];
      const body = rm[2];
      const name = tag(body, "name") ?? attr(attrs, "name") ?? tag(body, "type");
      const branch = attr(attrs, "branch") ?? tag(body, "branch") ?? undefined;
      const karat = tag(body, "karat") ?? attr(attrs, "karat") ?? undefined;
      const buy = toNumber(tag(body, "buy") ?? attr(attrs, "buy") ?? "");
      const sell = toNumber(tag(body, "sell") ?? attr(attrs, "sell") ?? "");
      if (!name || !Number.isFinite(buy) || !Number.isFinite(sell)) continue;
      if (buy < MIN_PRICE || sell < MIN_PRICE || buy > MAX_PRICE || sell > MAX_PRICE) continue;
      items.push({
        name: decodeEntities(name),
        branch: branch ? decodeEntities(branch) : undefined,
        karat: karat ? decodeEntities(karat) : undefined,
        buy,
        sell,
      });
    }
  }

  return { items, updatedAt };
}

function attr(src: string, key: string): string | undefined {
  const m = new RegExp(`${key}\\s*=\\s*"([^"]*)"`, "i").exec(src);
  return m?.[1];
}

function tag(src: string, name: string): string | undefined {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i").exec(src);
  return m?.[1]?.trim();
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .trim();
}

function tryParseVnDate(raw: string): string | undefined {
  const s = raw.trim();
  // ISO first
  const iso = new Date(s);
  if (!isNaN(iso.getTime()) && /\d{4}-\d{2}-\d{2}/.test(s)) return iso.toISOString();
  // dd/mm/yyyy [hh:mm[:ss]]
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (m) {
    const [, d, mo, y, hh = "9", mm = "0", ss = "0"] = m;
    // VN time is UTC+7 — convert local wall clock to UTC
    return new Date(Date.UTC(+y, +mo - 1, +d, +hh - 7, +mm, +ss)).toISOString();
  }
  return undefined;
}

export const FALLBACK_SNAPSHOT: GoldSnapshot = {
  source: "fallback",
  fetchedAt: "2026-09-07T09:00:00+07:00",
  items: [
    { name: "SJC 1L, 10L, 1KG", branch: "Hồ Chí Minh", karat: "SJC", buy: 119_000_000, sell: 121_000_000 },
    { name: "SJC 1L, 10L, 1KG", branch: "Hà Nội", karat: "SJC", buy: 119_000_000, sell: 121_020_000 },
    { name: "Nhẫn SJC 99,99% 1c, 2c, 5c", branch: "Hồ Chí Minh", karat: "24k", buy: 116_500_000, sell: 119_500_000 },
    { name: "Nữ trang 99,99%", branch: "Hồ Chí Minh", karat: "24k", buy: 116_000_000, sell: 118_500_000 },
    { name: "Nữ trang 75% (18k)", branch: "Hồ Chí Minh", karat: "18k", buy: 85_800_000, sell: 89_500_000 },
  ],
  note: "Dữ liệu dự phòng — không lấy được feed SJC live.",
};
