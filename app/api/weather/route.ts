import { NextResponse } from "next/server";
import { pickObservation, STATION_MAX_KM, type MetarReport } from "@/lib/weather-obs";

const CACHE_SECONDS = 300;
const KM_PER_DEG_LAT = 111;

async function fetchReports(lat: number, lon: number): Promise<MetarReport[]> {
  const dLat = STATION_MAX_KM / KM_PER_DEG_LAT;
  const dLon = dLat / Math.max(0.1, Math.cos((lat * Math.PI) / 180));
  const bbox = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(3)).join(",");
  const res = await fetch(`https://aviationweather.gov/api/data/metar?bbox=${bbox}&format=json`, {
    headers: { "User-Agent": "format-box-weather/1.0" },
    next: { revalidate: CACHE_SECONDS },
  });
  // The API answers 204 with an empty body when no station is in the box.
  if (!res.ok || res.status === 204) return [];
  return (await res.json()) as MetarReport[];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (
    !searchParams.get("lat") ||
    !searchParams.get("lon") ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }

  let observation = null;
  try {
    observation = pickObservation(await fetchReports(lat, lon), lat, lon, Date.now());
  } catch {
    // The client falls back to the forecast model when no observation is available.
  }

  return NextResponse.json(
    { observation },
    { headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}` } },
  );
}
