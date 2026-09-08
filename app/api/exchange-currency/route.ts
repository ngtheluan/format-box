import { NextResponse } from "next/server";
import { CURRENCIES, FALLBACK_SNAPSHOT, type ExchangeSnapshot } from "@/lib/currency";

export const revalidate = 3600; // 1h — mid-market rates move slowly

const ALLOWED = new Set(CURRENCIES.map((c) => c.code));
const SOURCE = "https://open.er-api.com/v6/latest/USD";

async function fetchLive(): Promise<ExchangeSnapshot> {
  const res = await fetch(SOURCE, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`open.er-api HTTP ${res.status}`);
  const json: {
    result?: string;
    base_code?: string;
    time_last_update_utc?: string;
    rates?: Record<string, number>;
  } = await res.json();
  if (json.result !== "success" || !json.rates) throw new Error("Feed trả không hợp lệ");

  const rates: Record<string, number> = {};
  for (const [k, v] of Object.entries(json.rates)) {
    if (ALLOWED.has(k) && typeof v === "number") rates[k] = v;
  }
  if (!rates.USD) rates.USD = 1;

  return {
    source: "open-er-api",
    base: json.base_code ?? "USD",
    updatedAt: json.time_last_update_utc ? new Date(json.time_last_update_utc).toISOString() : new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    rates,
  };
}

export async function GET() {
  try {
    const snap = await fetchLive();
    return NextResponse.json(snap, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(FALLBACK_SNAPSHOT, {
      headers: { "Cache-Control": "s-maxage=60" },
    });
  }
}
