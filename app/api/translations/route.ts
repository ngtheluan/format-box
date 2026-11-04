import { NextResponse } from "next/server";
import { getTranslations } from "@/lib/translations";

export const runtime = "nodejs";

export async function GET() {
  const dict = await getTranslations();
  return NextResponse.json(
    { dict },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
