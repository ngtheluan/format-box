// Vietlott (điện toán) results + ticket matcher.
//
// Products supported:
//   - "power655": Power 6/55 — 6 white balls + 1 power ball (1..55).
//   - "mega645":  Mega 6/45  — 6 balls (1..45).
//
// Source: minhngoc.net.vn Vietlott mirror. Chosen over vietlott.vn because its
// results page is a static HTML list of the last ~10 draws (id + date + balls
// + jackpot amounts), so one fetch backs the whole "recent draws" list in the
// UI. Vietlott.vn only exposes the newest draw statically; history there needs
// per-draw AjaxPro calls.

export type VietlottProduct = "power655" | "mega645";

export const VIETLOTT_PRODUCTS: { key: VietlottProduct; label: string; schedule: string; color: string }[] = [
  { key: "mega645", label: "Mega 6/45", schedule: "Thứ 4, 6, CN", color: "#e74c3c" },
  { key: "power655", label: "Power 6/55", schedule: "Thứ 3, 5, 7", color: "#c0392b" },
];

export type VietlottDraw = {
  drawId: string; // "01394"
  date: string; // "dd/mm/yyyy"
  whiteBalls: string[]; // 6 numbers, 2-digit strings
  powerBall?: string; // Power 6/55 only
  jackpot1?: string; // formatted VND (with thousand separators as source printed)
  jackpot2?: string; // Power 6/55 only
  jackpotWon?: boolean; // any Jackpot winner announced on this draw
};

export type VietlottSnapshot = {
  source: "minhngoc" | "fallback";
  sourceUrl?: string;
  product: VietlottProduct;
  draws: VietlottDraw[]; // newest first
  nextDrawId?: string; // for "estimated jackpot for kỳ #N+1"
  fetchedAt: string;
  note?: string;
};

export const VIETLOTT_URLS: Record<VietlottProduct, string> = {
  power655: "https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/power-6x55.html",
  mega645: "https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/mega-6x45.html",
};

// ---- Ticket matching ----

export type VietlottTicketMatch = {
  drawId?: string;
  matched: number; // count of white-ball matches
  powerMatched?: boolean;
  tier: string; // "Jackpot 1", "Jackpot 2", "Nhất", "Nhì", "Ba", "—"
  hitNumbers: string[];
};

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
  draw: VietlottDraw,
  product: VietlottProduct,
): VietlottTicketMatch {
  const norm = (n: string) => String(parseInt(n, 10)).padStart(2, "0");
  const drawn = new Set(draw.whiteBalls.map(norm));
  const hits: string[] = [];
  for (const n of ticketNumbers.slice(0, 6)) {
    const nn = norm(n);
    if (drawn.has(nn) && !hits.includes(nn)) hits.push(nn);
  }
  const powerHit =
    product === "power655" && ticketNumbers.length > 6
      ? norm(ticketNumbers[6]) === norm(draw.powerBall ?? "")
      : false;
  const tier = classifyMatch(product, hits.length, powerHit);
  return { drawId: draw.drawId, matched: hits.length, powerMatched: powerHit, tier, hitNumbers: hits };
}

// ---- Parsing (minhngoc.net.vn) ----

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&agrave;": "à",
  "&aacute;": "á",
  "&egrave;": "è",
  "&eacute;": "é",
  "&iacute;": "í",
  "&ograve;": "ò",
  "&oacute;": "ó",
  "&ugrave;": "ù",
  "&uacute;": "ú",
  "&yacute;": "ý",
  "&ntilde;": "ñ",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m) => HTML_ENTITIES[m.toLowerCase()] ?? m);
}

function stripTags(s: string) {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

// Extract every "<div class="finnishN bool">NN</div>" from a slice of HTML,
// in order. finnish1..finnish6 are white balls; finnish7 (Power 6/55) is the
// power ball.
function extractFinnishBalls(html: string): { white: string[]; power?: string } {
  const balls: { idx: number; val: string }[] = [];
  const re = /<div[^>]*class="[^"]*\bfinnish(\d)\s+bool[^"]*"[^>]*>\s*(\d{1,2})\s*<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    balls.push({ idx: Number(m[1]), val: m[2].padStart(2, "0") });
  }
  const white = balls.filter((b) => b.idx >= 1 && b.idx <= 6).map((b) => b.val);
  const powerBall = balls.find((b) => b.idx === 7)?.val;
  return { white, power: powerBall };
}

// A single draw block starts at "Kỳ vé:" and runs until the next occurrence of
// "Kỳ vé:" (or end of document). We slice the source into those windows.
function splitDrawBlocks(html: string): string[] {
  const marker = /K[yỳ]\s*v[eé]:/g;
  const positions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(html)) !== null) positions.push(m.index);
  const out: string[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : html.length;
    out.push(html.slice(start, end));
  }
  return out;
}

function parseDrawBlock(block: string, product: VietlottProduct): VietlottDraw | null {
  const text = stripTags(block.slice(0, 2000));
  const meta = /K[yỳ]\s*v[eé][^#]*#(\d+)[^0-9]*(\d{2})\/(\d{2})\/(\d{4})/.exec(text);
  if (!meta) return null;
  const drawId = meta[1];
  const date = `${meta[2]}/${meta[3]}/${meta[4]}`;
  const { white, power } = extractFinnishBalls(block);
  if (white.length < 6) return null;

  // Jackpot amounts within this block.
  // Power 6/55 uses id="DT6X55_G_JACKPOT" / "DT6X55_G_JACKPOT2".
  // Mega 6/45  uses id="DT6X45_G_JACKPOT".
  const jackpotAt = (id: string): string | undefined => {
    const re = new RegExp(`id="${id}"[^>]*>\\s*([\\d,\\.]+)`, "i");
    const m = re.exec(block);
    return m ? m[1] : undefined;
  };
  const jackpot1 =
    product === "power655" ? jackpotAt("DT6X55_G_JACKPOT") : jackpotAt("DT6X45_G_JACKPOT");
  const jackpot2 = product === "power655" ? jackpotAt("DT6X55_G_JACKPOT2") : undefined;

  // Winner count for Jackpot on this draw — "DT6X55_S_JACKPOT" (or 45).
  const winnersAt = (id: string): number | undefined => {
    const re = new RegExp(`id="${id}"[^>]*>\\s*(\\d+)`, "i");
    const m = re.exec(block);
    return m ? Number(m[1]) : undefined;
  };
  const w1 =
    product === "power655" ? winnersAt("DT6X55_S_JACKPOT") : winnersAt("DT6X45_S_JACKPOT");
  const w2 = product === "power655" ? winnersAt("DT6X55_S_JACKPOT2") : undefined;
  const jackpotWon = (w1 ?? 0) > 0 || (w2 ?? 0) > 0;

  return {
    drawId: drawId.padStart(5, "0"),
    date,
    whiteBalls: white.slice(0, 6),
    powerBall: product === "power655" ? power : undefined,
    jackpot1,
    jackpot2,
    jackpotWon,
  };
}

export function parseMinhngocVietlott(html: string, product: VietlottProduct): VietlottSnapshot {
  const blocks = splitDrawBlocks(html);
  const draws: VietlottDraw[] = [];
  for (const b of blocks) {
    const d = parseDrawBlock(b, product);
    if (d) draws.push(d);
  }
  // Newest first — page order is already newest first.
  const nextDrawId = draws[0] ? String(Number(draws[0].drawId) + 1).padStart(5, "0") : undefined;
  return {
    source: "minhngoc",
    sourceUrl: VIETLOTT_URLS[product],
    product,
    draws,
    nextDrawId,
    fetchedAt: new Date().toISOString(),
  };
}

// ---- Fallback ----

export const FALLBACK_VIETLOTT: Record<VietlottProduct, VietlottSnapshot> = {
  power655: {
    source: "fallback",
    product: "power655",
    draws: [],
    fetchedAt: "",
    note: "Dữ liệu mẫu — không lấy được feed live.",
  },
  mega645: {
    source: "fallback",
    product: "mega645",
    draws: [],
    fetchedAt: "",
    note: "Dữ liệu mẫu — không lấy được feed live.",
  },
};
