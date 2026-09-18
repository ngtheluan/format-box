import { NextResponse } from "next/server";
import { getThemes } from "@/lib/themes";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const themes = await getThemes();
  return NextResponse.json(
    { themes },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
