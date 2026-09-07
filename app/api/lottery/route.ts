import { NextRequest, NextResponse } from "next/server";
import {
  FALLBACK_LOTTERY,
  type LotterySnapshot,
  type Region,
  MINHNGOC_URLS,
  minhngocUrlForDate,
  parseMinhngoc,
} from "@/lib/lottery";

export const revalidate = 300; // 5 min — latest-day feed. Older dates are static.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function isRegion(v: string | null): v is Region {
  return v === "mb" || v === "mn" || v === "mt";
}

// date param comes in as either yyyy-mm-dd (HTML date input) or dd-mm-yyyy.
// Normalize to the dd-mm-yyyy shape minhngoc expects.
function normalizeDate(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (dmy) return raw;
  return undefined;
}

async function fetchLive(region: Region, date?: string): Promise<LotterySnapshot> {
  const url = date ? minhngocUrlForDate(region, date) : MINHNGOC_URLS[region];
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/javascript,*/*",
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    },
    // Older dates are static; latest gets a short revalidate. Both fine at 300s.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`minhngoc HTTP ${res.status}`);
  const body = await res.text();
  const snap = parseMinhngoc(body, region);
  if (snap.provinces.length === 0) throw new Error("Không có kết quả cho ngày này");
  return { ...snap, sourceUrl: url };
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const region: Region = isRegion(sp.get("region")) ? (sp.get("region") as Region) : "mb";
  const date = normalizeDate(sp.get("date"));
  try {
    const snap = await fetchLive(region, date);
    return NextResponse.json(snap, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ...FALLBACK_LOTTERY[region],
        fetchedAt: new Date().toISOString(),
        note: `Không lấy được dữ liệu (${err instanceof Error ? err.message : "unknown"}). Hiển thị dữ liệu dự phòng.`,
      } satisfies LotterySnapshot,
      { status: 200 },
    );
  }
}
