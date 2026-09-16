export type FuelKind = "e10_ron95" | "e5_ron92" | "diesel" | "kerosene" | "mazut";

export type FuelItem = {
  kind: FuelKind;
  name: string;
  price: number; // VND per unit
  unit: "L" | "kg";
  change?: number; // signed: positive = up, negative = down (VND)
};

export type FuelSnapshot = {
  source: "vnexpress" | "fallback";
  articleUrl?: string;
  articleTitle?: string;
  publishedAt?: string; // ISO
  fetchedAt: string; // ISO
  items: FuelItem[];
  note?: string;
};

export type FuelHistoryPoint = {
  date: string; // ISO
  articleUrl: string;
  items: FuelItem[];
};

export type FuelHistory = {
  source: "vnexpress" | "fallback";
  fetchedAt: string;
  points: FuelHistoryPoint[]; // oldest → newest
  note?: string;
};

const NAMES: Record<FuelKind, string> = {
  e10_ron95: "Xăng E10 RON 95-III",
  e5_ron92: "Xăng E5 RON 92",
  diesel: "Dầu Diesel",
  kerosene: "Dầu hoả",
  mazut: "Mazut",
};

const UNITS: Record<FuelKind, "L" | "kg"> = {
  e10_ron95: "L",
  e5_ron92: "L",
  diesel: "L",
  kerosene: "L",
  mazut: "kg",
};

// Match patterns like:
//   "E10 RON 95-III tăng 670 đồng lên 23.270 đồng một lít"
//   "E5 RON 92 thêm 720 đồng, ở mức 22.480 đồng"
//   "dầu diesel giảm 340 đồng, có giá mới 27.740 đồng một lít"
//   "mazut còn 17.640 đồng một kg"
// Rule: find fuel keyword, then within ~180 chars the FIRST price number "NN.NNN".
// Change amount (if present) comes BEFORE the price, prefixed by "tăng/thêm/giảm".
const FUEL_PATTERNS: { kind: FuelKind; regex: RegExp }[] = [
  { kind: "e10_ron95", regex: /(?:xăng\s+)?E10\s*(?:RON\s*)?95(?:-III)?/i },
  { kind: "e5_ron92", regex: /(?:xăng\s+)?E5\s*(?:RON\s*)?92/i },
  // Diesel: match "dầu diesel" or "diesel" but NOT "pha chế" world diesel (thùng) — handled by picking earliest occurrence with price nearby
  { kind: "diesel", regex: /(?:dầu\s+)?diesel(?:\s+0[,.]05S)?/i },
  { kind: "kerosene", regex: /dầu\s+ho[ảa]/i },
  { kind: "mazut", regex: /mazut/i },
];

const CHANGE_RE = /(tăng|thêm|giảm|hạ)\s+([0-9]{1,3}(?:\.[0-9]{3})*)\s*đồng/i;
const PRICE_RE = /([0-9]{2}(?:\.[0-9]{3})+)\s*đồng/g;

function findPriceFor(text: string, matchIdx: number, matchLen: number): { price: number; change?: number } | null {
  const window = text.slice(matchIdx, matchIdx + matchLen + 220);
  // Find first plausible price in the window
  const priceMatch = new RegExp(PRICE_RE.source).exec(window);
  if (!priceMatch) return null;
  // Skip world-market / percentage sentences (e.g. "E10 RON 95 tăng 9,2% lên 132,2 USD"),
  // whose window can spill into the next retail paragraph and grab the wrong price.
  const preSegment = window.slice(0, priceMatch.index);
  if (/USD|%/i.test(preSegment)) return null;
  const price = Number(priceMatch[1].replace(/\./g, ""));
  if (!Number.isFinite(price) || price < 5000 || price > 100000) return null;

  let change: number | undefined;
  const changeMatch = CHANGE_RE.exec(window.slice(0, priceMatch.index));
  if (changeMatch) {
    const amount = Number(changeMatch[2].replace(/\./g, ""));
    if (Number.isFinite(amount)) {
      const dir = /tăng|thêm/i.test(changeMatch[1]) ? 1 : -1;
      change = dir * amount;
    }
  }
  return { price, change };
}

export function extractPricesFromArticle(text: string): FuelItem[] {
  // Normalize whitespace
  const t = text.replace(/\s+/g, " ");
  const found: FuelItem[] = [];
  const seen = new Set<FuelKind>();
  for (const { kind, regex } of FUEL_PATTERNS) {
    // Find the FIRST occurrence that has a nearby VN price (5-6 digit)
    const globalRe = new RegExp(regex.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = globalRe.exec(t)) !== null) {
      const got = findPriceFor(t, m.index, m[0].length);
      if (got) {
        found.push({
          kind,
          name: NAMES[kind],
          unit: UNITS[kind],
          price: got.price,
          change: got.change,
        });
        seen.add(kind);
        break;
      }
    }
  }
  return found.filter((it) => seen.has(it.kind));
}

// Fallback snapshot — kept minimal, used only if fetch chain totally fails.
export const FALLBACK_SNAPSHOT: FuelSnapshot = {
  source: "fallback",
  fetchedAt: "2026-09-03T15:00:00+07:00",
  items: [
    { kind: "e10_ron95", name: NAMES.e10_ron95, unit: "L", price: 0 },
    { kind: "e5_ron92", name: NAMES.e5_ron92, unit: "L", price: 0 },
    { kind: "diesel", name: NAMES.diesel, unit: "L", price: 0 },
    { kind: "mazut", name: NAMES.mazut, unit: "kg", price: 0 },
  ],
  note: "Dữ liệu dự phòng (03/09/2026) — không lấy được bài mới nhất.",
};
