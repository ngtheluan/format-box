export type GoldItem = {
  code: string; // e.g. "SJC", "N24K", "75"
  name: string; // human-readable name
  karat?: string; // display badge (SJC, 24K, 18K, …)
  buy: number; // VND per lượng (10 chỉ, ~37.5 g)
  sell: number; // VND per lượng
  note?: string;
};

export type GoldSnapshot = {
  source: "pnj" | "fallback";
  sourceUrl?: string;
  branch?: string; // e.g. "hochiminh"
  updatedAt?: string; // ISO — from provider
  fetchedAt: string; // ISO — when we pulled it
  unit: "lượng"; // display unit
  items: GoldItem[];
  note?: string;
};

// PNJ's public API — the same feed powering giavang.pnj.com.vn.
// Response shape:
//   { data: [{ masp, tensp, giaban, giamua }, …],
//     chinhanh: "hochiminh",
//     updateDate: "dd/mm/yyyy HH:mm:ss", … }
// giaban/giamua are quoted in **nghìn đồng per chỉ** (integers).
// 1 lượng = 10 chỉ, so đ/lượng = value * 1000 * 10 = value * 10_000.
type PnjItem = {
  masp: string;
  tensp: string;
  giaban: number | string;
  giamua: number | string;
  note?: string;
};

type PnjResponse = {
  data?: PnjItem[];
  chinhanh?: string;
  updateDate?: string;
  errors?: unknown;
};

const CHI_TO_LUONG = 10;

function toNumber(v: number | string): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const cleaned = v.replace(/[^\d]/g, "");
  return cleaned ? Number(cleaned) : NaN;
}

function karatFromCode(code: string, name: string): string {
  const c = code.toUpperCase();
  if (c === "SJC") return "SJC";
  if (/24K|N24K|999\.9|KB|TL|PNJ$/i.test(code) || /999\.9|24K/i.test(name)) return "24K";
  if (/22K|916/i.test(code + name)) return "22K";
  if (/18K|750/i.test(code + name)) return "18K";
  if (/16\.3K|680/i.test(code + name)) return "16K";
  if (/15\.6K|650/i.test(code + name)) return "15K";
  if (/14\.6K|610/i.test(code + name)) return "14.6K";
  if (/14K|585/i.test(code + name)) return "14K";
  if (/10K|416/i.test(code + name)) return "10K";
  if (/9K|375/i.test(code + name)) return "9K";
  if (/8K|333/i.test(code + name)) return "8K";
  if (/RAW/i.test(code)) return "NL";
  return code;
}

export function parsePnjResponse(json: unknown): {
  items: GoldItem[];
  updatedAt?: string;
  branch?: string;
} {
  const r = json as PnjResponse;
  if (!r || !Array.isArray(r.data)) return { items: [] };

  const items: GoldItem[] = [];
  for (const row of r.data) {
    if (!row || typeof row.masp !== "string") continue;
    const buyChi = toNumber(row.giamua);
    const sellChi = toNumber(row.giaban);
    // Some rows (raw material) may have empty giaban; skip if both invalid.
    const hasBuy = Number.isFinite(buyChi) && buyChi > 0;
    const hasSell = Number.isFinite(sellChi) && sellChi > 0;
    if (!hasBuy && !hasSell) continue;

    const buy = hasBuy ? buyChi * 1000 * CHI_TO_LUONG : 0;
    const sell = hasSell ? sellChi * 1000 * CHI_TO_LUONG : 0;

    items.push({
      code: row.masp,
      name: row.tensp || row.masp,
      karat: karatFromCode(row.masp, row.tensp || ""),
      buy: hasBuy ? buy : sell,
      sell: hasSell ? sell : buy,
      note: row.note,
    });
  }

  let updatedAt: string | undefined;
  if (r.updateDate) {
    const iso = parseVnDate(r.updateDate);
    if (iso) updatedAt = iso;
  }

  return { items, updatedAt, branch: r.chinhanh };
}

function parseVnDate(raw: string): string | undefined {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(raw.trim());
  if (!m) return undefined;
  const [, d, mo, y, hh = "9", mm = "0", ss = "0"] = m;
  // VN is UTC+7 — convert wall clock to UTC
  return new Date(Date.UTC(+y, +mo - 1, +d, +hh - 7, +mm, +ss)).toISOString();
}

export const FALLBACK_SNAPSHOT: GoldSnapshot = {
  source: "fallback",
  branch: "hochiminh",
  unit: "lượng",
  fetchedAt: "2026-09-07T09:00:00+07:00",
  items: [
    { code: "SJC", name: "Vàng miếng SJC 999.9", karat: "SJC", buy: 0, sell: 0 },
    { code: "N24K", name: "Nhẫn Trơn PNJ 999.9", karat: "24K", buy: 0, sell: 0 },
    { code: "24K", name: "Vàng nữ trang 999.9", karat: "24K", buy: 0, sell: 0 },
    { code: "22K", name: "Vàng 916 (22K)", karat: "22K", buy: 0, sell: 0 },
    { code: "75", name: "Vàng 750 (18K)", karat: "18K", buy: 0, sell: 0 },
    { code: "58.5", name: "Vàng 585 (14K)", karat: "14K", buy: 0, sell: 0 },
    { code: "41", name: "Vàng 416 (10K)", karat: "10K", buy: 0, sell: 0 },
  ],
  note: "Dữ liệu dự phòng — không lấy được feed PNJ live.",
};
