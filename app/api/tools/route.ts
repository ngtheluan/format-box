import { NextResponse } from "next/server";
import { getTools } from "@/lib/tools";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const tools = await getTools();
  return NextResponse.json({ tools }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
