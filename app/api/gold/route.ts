import { NextResponse } from "next/server";
import { FALLBACK_SNAPSHOT, type GoldSnapshot, parsePnjResponse } from "@/lib/gold";

export const revalidate = 300; // 5 min — PNJ updates several times per day

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// PNJ's public feed — same JSON that powers giavang.pnj.com.vn.
// Returns 20+ gold products (SJC, PNJ 24K, 22K, 18K, 14K, 10K, …) in near-realtime.
const PNJ_URL = "https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price";

async function fetchLive(): Promise<GoldSnapshot> {
  const res = await fetch(PNJ_URL, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`PNJ HTTP ${res.status}`);
  const json = await res.json();
  const { items, updatedAt, branch } = parsePnjResponse(json);
  if (items.length === 0) throw new Error("Feed PNJ trả 0 item");

  return {
    source: "pnj",
    sourceUrl: PNJ_URL,
    branch,
    updatedAt,
    fetchedAt: new Date().toISOString(),
    unit: "lượng",
    items,
  };
}

export async function GET() {
  try {
    const snap = await fetchLive();
    return NextResponse.json(snap, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ...FALLBACK_SNAPSHOT,
        fetchedAt: new Date().toISOString(),
        note: `Không lấy được dữ liệu live (${err instanceof Error ? err.message : "unknown"}). Hiển thị dữ liệu dự phòng.`,
      } satisfies GoldSnapshot,
      { status: 200 },
    );
  }
}
