import { NextRequest, NextResponse } from "next/server";
import {
  FALLBACK_VIETLOTT,
  parseVietlott,
  VIETLOTT_URLS,
  type VietlottProduct,
  type VietlottSnapshot,
} from "@/lib/vietlott";

export const revalidate = 300;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function isProduct(v: string | null): v is VietlottProduct {
  return v === "power655" || v === "mega645";
}

async function fetchLive(product: VietlottProduct): Promise<VietlottSnapshot> {
  const url = VIETLOTT_URLS[product];
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,*/*",
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`vietlott HTTP ${res.status}`);
  const body = await res.text();
  const snap = parseVietlott(body, product);
  if (snap.whiteBalls.length < 6) throw new Error("Chưa có kết quả");
  return snap;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const product: VietlottProduct = isProduct(sp.get("product")) ? (sp.get("product") as VietlottProduct) : "power655";
  try {
    const snap = await fetchLive(product);
    return NextResponse.json(snap, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ...FALLBACK_VIETLOTT[product],
        fetchedAt: new Date().toISOString(),
        note: `Không lấy được dữ liệu (${err instanceof Error ? err.message : "unknown"}). Hiển thị dữ liệu dự phòng.`,
      } satisfies VietlottSnapshot,
      { status: 200 },
    );
  }
}
