import { NextRequest, NextResponse } from "next/server";
import {
  FALLBACK_LOTTERY,
  type LotterySnapshot,
  type Region,
  MINHNGOC_URLS,
  minhngocUrlForDate,
  parseMinhngoc,
} from "@/lib/lottery";

export const revalidate = 0; // Never statically cache this route — latest draws
// change intra-day (MN ~16:15, MT ~17:15, MB ~18:15). Upstream fetches below
// pick their own TTL based on whether the request is for the latest draw or an
// archived date.

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
  // Archived date is static → cache 1h. Latest-draw page changes intra-day
  // around the draw window → cache only 30s so new results surface quickly.
  const upstreamRevalidate = date ? 3600 : 30;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/javascript,*/*",
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    },
    next: { revalidate: upstreamRevalidate },
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
      headers: {
        "Cache-Control": date
          ? "s-maxage=3600, stale-while-revalidate=86400"
          : "s-maxage=30, stale-while-revalidate=120",
      },
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
