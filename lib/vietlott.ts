// Vietlott (điện toán) results + ticket matcher.
// Products supported:
//   - "power655": Power 6/55 — 6 white balls + 1 power ball (1..55).
//   - "mega645":  Mega 6/45  — 6 balls (1..45).
//
// Source: vietlott.vn official public results page (server-rendered HTML for
// the latest draw). Parsed by class name — see parseVietlott().

export type VietlottProduct = "power655" | "mega645";

export const VIETLOTT_PRODUCTS: { key: VietlottProduct; label: string; schedule: string }[] = [
  { key: "power655", label: "Power 6/55", schedule: "Thứ 3, 5, 7" },
  { key: "mega645", label: "Mega 6/45", schedule: "Thứ 4, 6, CN" },
];

export type VietlottSnapshot = {
  source: "vietlott" | "fallback";
  sourceUrl?: string;
  product: VietlottProduct;
  drawId?: string; // "01559"
  resultDate?: string; // "dd/mm/yyyy"
  whiteBalls: string[]; // 6 numbers, 2-digit strings
  powerBall?: string; // Power 6/55 only
  jackpot1?: string; // formatted VND string as shown on source
  jackpot2?: string; // Power 6/55 has 2 jackpots
  fetchedAt: string;
  note?: string;
};

export const VIETLOTT_URLS: Record<VietlottProduct, string> = {
  power655: "https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/655",
  mega645: "https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/645",
};

// ---- Ticket matching ----

export type VietlottTicketMatch = {
  matched: number; // count of white-ball matches
  powerMatched?: boolean; // Power 6/55 only
  tier: string; // "Jackpot 1", "Jackpot 2", "Nhất", "Nhì", "Ba", "Tư", "—"
  hitNumbers: string[]; // the ticket numbers that matched a drawn white ball
};

// Prize tier table (per Vietlott official rules).
// Power 6/55: match 6 white → Jackpot 1; match 5 white + power → Jackpot 2;
//             5 white → Nhất; 4 white → Nhì; 3 white → Ba.
// Mega 6/45:  6 → Jackpot; 5 → Nhất; 4 → Nhì; 3 → Ba.
function classifyMatch(product: VietlottProduct, matched: number, powerHit: boolean): string {
  if (product === "power655") {
    if (matched === 6) return "Jackpot 1";
    if (matched === 5 && powerHit) return "Jackpot 2";
    if (matched === 5) return "Giải Nhất";
    if (matched === 4) return "Giải Nhì";
    if (matched === 3) return "Giải Ba";
    return "—";
  }
  if (matched === 6) return "Jackpot";
  if (matched === 5) return "Giải Nhất";
  if (matched === 4) return "Giải Nhì";
  if (matched === 3) return "Giải Ba";
  return "—";
}

export function matchVietlottTicket(
  ticketNumbers: string[],
  snap: VietlottSnapshot,
): VietlottTicketMatch {
  const norm = (n: string) => String(parseInt(n, 10)).padStart(2, "0");
  const drawn = new Set(snap.whiteBalls.map(norm));
  const hits: string[] = [];
  for (const n of ticketNumbers) {
    const nn = norm(n);
    if (drawn.has(nn) && !hits.includes(nn)) hits.push(nn);
  }
  const powerHit =
    snap.product === "power655" && ticketNumbers.length > 6
      ? norm(ticketNumbers[6]) === norm(snap.powerBall ?? "")
      : false;
  const tier = classifyMatch(snap.product, hits.length, powerHit);
  return { matched: hits.length, powerMatched: powerHit, tier, hitNumbers: hits };
}

// ---- Parsing (vietlott.vn HTML) ----

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Grab every "<span class="bong_tron ..."">NN</span>" in order. Power 6/55
// splits white balls and the power ball with an "<i>|</i>" divider; Mega has
// just 6 in a row. We return everything in DOM order — the caller splits.
function extractBalls(html: string): string[] {
  const out: string[] = [];
  const re = /<span[^>]*class="[^"]*bong_tron[^"]*"[^>]*>\s*(\d{1,2})\s*<\/span>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1].padStart(2, "0"));
  return out;
}

function extractDate(html: string): string | undefined {
  // "Kỳ quay thưởng #XXXXX ngày dd/mm/yyyy" appears in the header block.
  const m = /ngày\s*[^0-9]*(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(stripTags(html));
  if (!m) return undefined;
  return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
}

function extractDrawId(html: string): string | undefined {
  // The prev-page link exposes the previous draw id — the current is +1.
  // As a resilient fallback, we also look for "Kỳ quay thưởng #NNNNN".
  const m1 = /K[yỳ]\s*quay\s*th[uư][ơo]ng[^0-9#]*#?\s*(\d{4,7})/i.exec(stripTags(html));
  if (m1) return m1[1];
  const m2 = /ClientDrawResult\('(\d+)'\)/.exec(html);
  if (m2) return String(Number(m2[1]) + 1).padStart(m2[1].length, "0");
  return undefined;
}

function extractJackpots(html: string, product: VietlottProduct): { j1?: string; j2?: string } {
  // Vietlott renders "<h5>Jackpot 1</h5>...<h3>55.361.787.150</h3>" blocks.
  // A single Mega jackpot appears under "Giá trị Jackpot".
  const grab = (label: RegExp): string | undefined => {
    const m = new RegExp(`${label.source}[\\s\\S]{0,600}?<h3[^>]*>\\s*([\\d.,]+)\\s*<`, "i").exec(html);
    return m ? m[1] : undefined;
  };
  if (product === "power655") {
    return { j1: grab(/Jackpot\s*1/), j2: grab(/Jackpot\s*2/) };
  }
  return { j1: grab(/Giá\s*trị\s*Jackpot/) };
}

export function parseVietlott(html: string, product: VietlottProduct): VietlottSnapshot {
  const balls = extractBalls(html);
  let whiteBalls: string[] = [];
  let powerBall: string | undefined;
  if (product === "power655") {
    whiteBalls = balls.slice(0, 6);
    powerBall = balls[6];
  } else {
    whiteBalls = balls.slice(0, 6);
  }
  const resultDate = extractDate(html);
  const drawId = extractDrawId(html);
  const { j1, j2 } = extractJackpots(html, product);
  return {
    source: "vietlott",
    sourceUrl: VIETLOTT_URLS[product],
    product,
    drawId,
    resultDate,
    whiteBalls,
    powerBall,
    jackpot1: j1,
    jackpot2: j2,
    fetchedAt: new Date().toISOString(),
  };
}

// ---- Fallback ----

export const FALLBACK_VIETLOTT: Record<VietlottProduct, VietlottSnapshot> = {
  power655: {
    source: "fallback",
    product: "power655",
    resultDate: "",
    whiteBalls: ["09", "11", "24", "31", "33", "47"],
    powerBall: "21",
    fetchedAt: "",
    note: "Dữ liệu mẫu — không lấy được feed live.",
  },
  mega645: {
    source: "fallback",
    product: "mega645",
    resultDate: "",
    whiteBalls: ["09", "14", "22", "26", "27", "40"],
    fetchedAt: "",
    note: "Dữ liệu mẫu — không lấy được feed live.",
  },
};
