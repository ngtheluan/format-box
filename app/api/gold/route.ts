import { NextResponse } from "next/server";
import { FALLBACK_SNAPSHOT, type GoldSnapshot, parseSjcXml } from "@/lib/gold";

export const revalidate = 300; // 5 min — SJC quotes update several times per day

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SJC_XML = "https://sjc.com.vn/xml/tygiavang.xml";

async function fetchLive(): Promise<GoldSnapshot> {
  const res = await fetch(SJC_XML, {
    headers: { "User-Agent": UA, Accept: "application/xml,text/xml,*/*" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`SJC HTTP ${res.status}`);
  const xml = await res.text();
  const { items, updatedAt } = parseSjcXml(xml);
  if (items.length === 0) throw new Error("Không parse được item nào từ feed SJC");

  return {
    source: "sjc",
    sourceUrl: SJC_XML,
    updatedAt,
    fetchedAt: new Date().toISOString(),
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
        note: `Không lấy được feed live (${err instanceof Error ? err.message : "unknown"}). Hiển thị dữ liệu dự phòng.`,
      } satisfies GoldSnapshot,
      { status: 200 },
    );
  }
}
