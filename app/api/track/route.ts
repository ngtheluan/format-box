import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { SEED_TOOLS } from "@/lib/tools-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN = new Set(SEED_TOOLS.map((t) => t.href));

function pickIp(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return (
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    h.get("x-vercel-forwarded-for") ||
    null
  );
}

function decodeCity(v: string | null): string | null {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function POST(req: Request) {
  try {
    const { href } = (await req.json().catch(() => ({}))) as { href?: string };
    if (href && KNOWN.has(href)) {
      const sb = supabase();
      if (sb) {
        const h = req.headers;
        await sb.rpc("log_tool_event", {
          p_href: href,
          p_ip: pickIp(h),
          p_ua: h.get("user-agent"),
          p_country: h.get("x-vercel-ip-country"),
          p_city: decodeCity(h.get("x-vercel-ip-city")),
          p_region: h.get("x-vercel-ip-country-region"),
          p_referer: h.get("referer"),
          p_lang: h.get("accept-language")?.split(",")[0] || null,
        });
      }
    }
  } catch {
    // swallow — tracking must never surface an error to the client
  }
  return new NextResponse(null, { status: 204 });
}
