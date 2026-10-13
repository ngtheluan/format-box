import { NextResponse } from "next/server";
import { getTranslations } from "@/lib/translations";

export const runtime = "nodejs";

export async function GET() {
  const dict = await getTranslations();
  return NextResponse.json(
    { dict },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } },
  );
}
