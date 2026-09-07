// Vietnamese lottery ("xổ số") results + ticket matcher.
// Regions:
//   - "mb" (miền Bắc): 1 draw/day at ~18:15, 8 prize categories, 27 numbers total.
//     Special prize (ĐB) = 5 digits.
//   - "mn" / "mt" (miền Nam / miền Trung): several provinces draw each day.
//     Special prize (ĐB) = 6 digits.
//
// Matching rule ("dò vé"): a ticket wins if its trailing N digits equal a prize
// number of length N. We report the best (highest-value) prize found.

export type Region = "mb" | "mn" | "mt";

export type PrizeTier =
  | "special" // ĐB
  | "g1"
  | "g2"
  | "g3"
  | "g4"
  | "g5"
  | "g6"
  | "g7"
  | "g8";

export type PrizeRow = {
  tier: PrizeTier;
  label: string; // "ĐB", "G1"...
  numbers: string[];
};

export type ProvinceResult = {
  province: string; // "Miền Bắc" for MB; e.g. "TP. HCM" for MN
  code?: string; // short code (e.g. "XSHCM")
  date?: string; // "dd/mm/yyyy" as printed by source
  prizes: PrizeRow[];
};

export type LotterySnapshot = {
  source: "minhngoc" | "fallback";
  sourceUrl?: string;
  region: Region;
  updatedAt?: string; // ISO — pubDate of the item we used
  fetchedAt: string; // ISO
  resultDate?: string; // dd/mm/yyyy — the draw date of the results shown
  provinces: ProvinceResult[];
  note?: string;
};

// ---- Ticket matching ----

export type TicketMatch = {
  province: string;
  tier: PrizeTier;
  label: string;
  matchedNumber: string; // the prize number that matched
  matchedDigits: number; // count of trailing digits that matched
};

// Prize length by tier for MB and MN/MT. Only used for display / to know how
// many trailing digits count as a match at each tier.
export const PRIZE_LENGTH: Record<Region, Partial<Record<PrizeTier, number>>> = {
  mb: { special: 5, g1: 5, g2: 5, g3: 5, g4: 4, g5: 4, g6: 3, g7: 2 },
  mn: { special: 6, g1: 5, g2: 5, g3: 5, g4: 5, g5: 4, g6: 4, g7: 3, g8: 2 },
  mt: { special: 6, g1: 5, g2: 5, g3: 5, g4: 5, g5: 4, g6: 4, g7: 3, g8: 2 },
};

const TIER_RANK: PrizeTier[] = ["special", "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"];

function tierRank(t: PrizeTier) {
  const i = TIER_RANK.indexOf(t);
  return i < 0 ? 99 : i;
}

export function matchTicket(ticket: string, snapshot: LotterySnapshot): TicketMatch[] {
  const cleaned = ticket.replace(/\D/g, "");
  if (!cleaned) return [];
  const hits: TicketMatch[] = [];
  for (const p of snapshot.provinces) {
    for (const row of p.prizes) {
      for (const raw of row.numbers) {
        const num = raw.replace(/\D/g, "");
        if (!num) continue;
        // Trailing-digits match: a G7 (2 digits) hits if ticket ends with those 2.
        const cmpLen = Math.min(num.length, cleaned.length);
        if (cmpLen === 0) continue;
        if (cleaned.slice(-cmpLen) === num.slice(-cmpLen)) {
          hits.push({
            province: p.province,
            tier: row.tier,
            label: row.label,
            matchedNumber: num,
            matchedDigits: cmpLen,
          });
        }
      }
    }
  }
  // Best first: higher tier (special > g1 ...) then more digits.
  hits.sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || b.matchedDigits - a.matchedDigits);
  return hits;
}

// ---- Source parsing (minhngoc.net.vn) ----
//
// minhngoc.net.vn exposes clean class-tagged HTML for each region:
//   - MB: mini widget JS at /getkqxs/mien-bac.js — contains one draw table
//     with cells classed `giaidb`, `giai1`..`giai7`, plus `class="ngay"` date.
//   - MN/MT: HTML pages /ket-qua-xo-so/mien-nam.html and .../mien-trung.html
//     contain a `bkqmiennam` (or `bkqmientrung`) table per day (newest first).
//     Each day contains many `rightcl` sub-tables, one per province, with
//     `class="tinh"` (name), `class="matinh"` (code) and `giaidb/giai1..8`
//     cells whose values are wrapped in <div>NNN</div> nodes.
//
// If today's draw hasn't published yet, the newest row is yesterday's — so
// "fall back to previous day" is inherent to just parsing the newest block.

export const MINHNGOC_URLS: Record<Region, string> = {
  mb: "https://www.minhngoc.net.vn/getkqxs/mien-bac.js",
  mn: "https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam.html",
  mt: "https://www.minhngoc.net.vn/ket-qua-xo-so/mien-trung.html",
};

// Build a per-date URL. `date` must be "dd-mm-yyyy" (minhngoc's own format).
export function minhngocUrlForDate(region: Region, date: string): string {
  if (region === "mb") return `https://www.minhngoc.net.vn/getkqxs/mien-bac/${date}.js`;
  const slug = region === "mn" ? "mien-nam" : "mien-trung";
  return `https://www.minhngoc.net.vn/ket-qua-xo-so/${slug}/${date}.html`;
}

const TIER_LABEL: Record<PrizeTier, string> = {
  special: "ĐB",
  g1: "G1",
  g2: "G2",
  g3: "G3",
  g4: "G4",
  g5: "G5",
  g6: "G6",
  g7: "G7",
  g8: "G8",
};

function stripTags(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

// Split numbers separated by " - " (minhngoc MB) or wrapped in <div>N</div>
// (minhngoc MN/MT). Returns clean digit-only strings.
function extractPrizeNumbers(cellHtml: string): string[] {
  // MN/MT: <div>NNN</div> per number
  const divMatches = cellHtml.match(/<div[^>]*>\s*([\d.]+)\s*<\/div>/gi);
  if (divMatches && divMatches.length > 0) {
    return divMatches.map((s) => s.replace(/<[^>]+>/g, "").replace(/\D/g, "")).filter(Boolean);
  }
  // MB: cell text like "83179 - 34863 - 27496 ..."
  const text = stripTags(cellHtml);
  return text
    .split(/[\s\-–—,]+/)
    .map((s) => s.replace(/\D/g, ""))
    .filter((s) => s.length >= 2);
}

const MB_TIER_CLASSES: { tier: PrizeTier; cls: string }[] = [
  { tier: "special", cls: "giaidb" },
  { tier: "g1", cls: "giai1" },
  { tier: "g2", cls: "giai2" },
  { tier: "g3", cls: "giai3" },
  { tier: "g4", cls: "giai4" },
  { tier: "g5", cls: "giai5" },
  { tier: "g6", cls: "giai6" },
  { tier: "g7", cls: "giai7" },
];

const MN_TIER_CLASSES: { tier: PrizeTier; cls: string }[] = [
  { tier: "special", cls: "giaidb" },
  { tier: "g1", cls: "giai1" },
  { tier: "g2", cls: "giai2" },
  { tier: "g3", cls: "giai3" },
  { tier: "g4", cls: "giai4" },
  { tier: "g5", cls: "giai5" },
  { tier: "g6", cls: "giai6" },
  { tier: "g7", cls: "giai7" },
  { tier: "g8", cls: "giai8" },
];

// Extract the CONTENT of the first <td class="XXX">…</td> whose class exactly
// contains `cls` (whole-word). Used for both MB (value cells) and MN (label
// cells before we descend into rightcl sub-tables).
function findTdByClass(src: string, cls: string, from = 0): { html: string; end: number } | null {
  const re = new RegExp(`<td[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/td>`, "i");
  const m = re.exec(src.slice(from));
  if (!m) return null;
  return { html: m[1], end: from + m.index + m[0].length };
}

function parseMbBlock(html: string): ProvinceResult | null {
  // date lives in <td class="ngay">Ngày: dd/mm/yyyy ...</td>
  const ngay = findTdByClass(html, "ngay");
  const dateM = ngay && /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(stripTags(ngay.html));
  const date = dateM ? `${dateM[1].padStart(2, "0")}/${dateM[2].padStart(2, "0")}/${dateM[3]}` : undefined;
  const prizes: PrizeRow[] = [];
  for (const { tier, cls } of MB_TIER_CLASSES) {
    const cell = findTdByClass(html, cls);
    if (!cell) continue;
    const nums = extractPrizeNumbers(cell.html);
    const expected = PRIZE_LENGTH.mb[tier];
    const filtered = expected ? nums.filter((n) => n.length === expected) : nums;
    if (filtered.length === 0) continue;
    prizes.push({ tier, label: TIER_LABEL[tier], numbers: filtered });
  }
  if (prizes.length === 0) return null;
  return { province: "Miền Bắc", code: "XSMB", date, prizes };
}

// Extract each <table class="rightcl">…</table> — one per province in a day block.
function splitProvinceTables(block: string): string[] {
  const out: string[] = [];
  const openRe = /<table[^>]*class="[^"]*\brightcl\b[^"]*"[^>]*>/gi;
  let om: RegExpExecArray | null;
  while ((om = openRe.exec(block)) !== null) {
    const startIdx = om.index;
    const tagRe = /<(\/?)table\b[^>]*>/gi;
    tagRe.lastIndex = om.index + om[0].length;
    let depth = 1;
    let tm: RegExpExecArray | null;
    while ((tm = tagRe.exec(block)) !== null) {
      depth += tm[1] === "/" ? -1 : 1;
      if (depth === 0) {
        out.push(block.slice(startIdx, tm.index + tm[0].length));
        openRe.lastIndex = tm.index + tm[0].length;
        break;
      }
    }
  }
  return out;
}

function parseProvinceTable(tableHtml: string, date?: string): ProvinceResult | null {
  const tinh = findTdByClass(tableHtml, "tinh");
  const matinh = findTdByClass(tableHtml, "matinh");
  const province = tinh ? stripTags(tinh.html) : "";
  const code = matinh ? stripTags(matinh.html).split(/\s+/)[0] : undefined;
  if (!province) return null;
  const prizes: PrizeRow[] = [];
  const region: Region = "mn"; // MN and MT share the same 9-tier structure
  for (const { tier, cls } of MN_TIER_CLASSES) {
    const cell = findTdByClass(tableHtml, cls);
    if (!cell) continue;
    const nums = extractPrizeNumbers(cell.html);
    const expected = PRIZE_LENGTH[region][tier];
    const filtered = expected ? nums.filter((n) => n.length === expected) : nums;
    if (filtered.length === 0) continue;
    prizes.push({ tier, label: TIER_LABEL[tier], numbers: filtered });
  }
  // Display order: ĐB first, then G1..G8
  prizes.sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
  if (prizes.length < 3) return null;
  return { province, code, date, prizes };
}

// Walk each `<table class="bkqmiennam"…>` (or bkqmientrung) opening tag and
// count nested tables to find its matching close. The bkqmien* tables may
// themselves be nested inside layout tables, so we don't gate on depth === 0.
function splitDayBlocks(html: string, outerClass: string): string[] {
  const out: string[] = [];
  const openRe = new RegExp(`<table[^>]*class="[^"]*\\b${outerClass}\\b[^"]*"[^>]*>`, "gi");
  let om: RegExpExecArray | null;
  while ((om = openRe.exec(html)) !== null) {
    const startIdx = om.index;
    const scanFrom = om.index + om[0].length;
    // Now walk table opens/closes from scanFrom until we return to depth 0
    // (starting AFTER the outer open).
    const tagRe = /<(\/?)table\b[^>]*>/gi;
    tagRe.lastIndex = scanFrom;
    let depth = 1;
    let tm: RegExpExecArray | null;
    while ((tm = tagRe.exec(html)) !== null) {
      depth += tm[1] === "/" ? -1 : 1;
      if (depth === 0) {
        out.push(html.slice(startIdx, tm.index + tm[0].length));
        openRe.lastIndex = tm.index + tm[0].length;
        break;
      }
    }
  }
  return out;
}

// Extract the day date from a `bkqmien*` block (leftcl column: <td class="ngay">).
function readBlockDate(block: string): string | undefined {
  const ngay = findTdByClass(block, "ngay");
  const t = ngay ? stripTags(ngay.html) : "";
  const m = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(t);
  return m ? `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}` : undefined;
}

export function parseMinhngoc(html: string, region: Region): LotterySnapshot {
  const groups: { date?: string; provinces: ProvinceResult[] }[] = [];
  if (region === "mb") {
    // Only one draw block in the mini widget.
    const res = parseMbBlock(html);
    if (res) groups.push({ date: res.date, provinces: [res] });
  } else {
    const outer = region === "mn" ? "bkqmiennam" : "bkqmientrung";
    const blocks = splitDayBlocks(html, outer);
    for (const block of blocks) {
      const date = readBlockDate(block);
      const provinceTables = splitProvinceTables(block);
      const provinces: ProvinceResult[] = [];
      for (const pt of provinceTables) {
        const parsed = parseProvinceTable(pt, date);
        if (parsed) provinces.push(parsed);
      }
      if (provinces.length > 0) groups.push({ date, provinces });
    }
  }

  // Newest day first — minhngoc serves them that way. If today's draw hasn't
  // published yet, groups[0] IS yesterday's data, which is what we want.
  const chosen = groups.find((g) => g.provinces.length > 0);

  return {
    source: "minhngoc",
    sourceUrl: MINHNGOC_URLS[region],
    region,
    fetchedAt: new Date().toISOString(),
    resultDate: chosen?.date,
    provinces: chosen?.provinces ?? [],
  };
}

// ---- Fallback (sample) data ----

function mkFallback(region: Region): LotterySnapshot {
  // fetchedAt is intentionally an empty string so SSR/CSR render the same value
  // for the initial fallback snapshot; the API route stamps a real timestamp
  // when it responds.
  if (region === "mb") {
    return {
      source: "fallback",
      region,
      fetchedAt: "",
      resultDate: "**/**/****",
      provinces: [
        {
          province: "Miền Bắc",
          code: "XSMB",
          date: "**/**/****",
          prizes: [
            { tier: "special", label: "ĐB", numbers: ["******"] },
            { tier: "g1", label: "G1", numbers: ["*****"] },
            { tier: "g2", label: "G2", numbers: ["*****"] },
            { tier: "g3", label: "G3", numbers: ["*****", "*****"] },
            { tier: "g4", label: "G4", numbers: ["*****", "*****", "*****", "*****", "*****", "*****", "*****"] },
            { tier: "g5", label: "G5", numbers: ["****"] },
            { tier: "g6", label: "G6", numbers: ["****", "****", "****"] },
            { tier: "g7", label: "G7", numbers: ["***"] },
            { tier: "g8", label: "G8", numbers: ["**"] },
          ],
        },
      ],
      note: "Dữ liệu mẫu — không lấy được feed live.",
    };
  }
  const provinces = region === "mn" ? ["TP. HCM", "Đồng Tháp", "Cà Mau"] : ["Thừa Thiên Huế", "Phú Yên"];
  return {
    source: "fallback",
    region,
    fetchedAt: "",
    resultDate: "**/**/****",
    provinces: provinces.map((province) => ({
      province,
      date: "**/**/****",
      prizes: [
        { tier: "special", label: "ĐB", numbers: ["******"] },
        { tier: "g1", label: "G1", numbers: ["*****"] },
        { tier: "g2", label: "G2", numbers: ["*****"] },
        { tier: "g3", label: "G3", numbers: ["*****", "*****"] },
        { tier: "g4", label: "G4", numbers: ["*****", "*****", "*****", "*****", "*****", "*****", "*****"] },
        { tier: "g5", label: "G5", numbers: ["****"] },
        { tier: "g6", label: "G6", numbers: ["****", "****", "****"] },
        { tier: "g7", label: "G7", numbers: ["***"] },
        { tier: "g8", label: "G8", numbers: ["**"] },
      ],
    })),
    note: "Dữ liệu mẫu — không lấy được feed live.",
  };
}

export const FALLBACK_LOTTERY: Record<Region, LotterySnapshot> = {
  mb: mkFallback("mb"),
  mn: mkFallback("mn"),
  mt: mkFallback("mt"),
};
