import { NextResponse } from "next/server";
import { getBanners, isBannerLive, sortBanners } from "@/lib/banners";

export const runtime = "nodejs";
export const revalidate = 60;

// Public feed consumed by the site chrome. Returns only banners that are live
// right now (enabled + inside their schedule window), already sorted.
export async function GET() {
  const now = Date.now();
  const banners = sortBanners(await getBanners()).filter((b) => isBannerLive(b, now));
  return NextResponse.json(
    { banners },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
