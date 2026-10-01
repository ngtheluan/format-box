import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import { SEED_BANNERS, type Banner, type BannerTone } from "./banners-shared";

export * from "./banners-shared";

type DbRow = {
  id: string;
  message_vi: string;
  message_en: string | null;
  href: string | null;
  cta_vi: string | null;
  cta_en: string | null;
  tone: string | null;
  enabled: boolean | null;
  dismissible: boolean | null;
  start_at: string | null;
  end_at: string | null;
  sort: number | null;
  updated_at: string | null;
};

const TONES = new Set(["info", "success", "warning", "danger"]);
const coerceTone = (t: string | null): BannerTone =>
  (t && TONES.has(t) ? t : "info") as BannerTone;

function rowToBanner(r: DbRow): Banner {
  return {
    id: r.id,
    messageVi: r.message_vi,
    messageEn: r.message_en ?? "",
    href: r.href ?? "",
    ctaVi: r.cta_vi ?? "",
    ctaEn: r.cta_en ?? "",
    tone: coerceTone(r.tone),
    enabled: r.enabled ?? true,
    dismissible: r.dismissible ?? true,
    startAt: r.start_at,
    endAt: r.end_at,
    sort: r.sort ?? 0,
    updatedAt: r.updated_at ?? new Date(0).toISOString(),
  };
}

export function bannerToRow(b: Banner): Record<string, unknown> {
  return {
    id: b.id,
    message_vi: b.messageVi,
    message_en: b.messageEn,
    href: b.href || null,
    cta_vi: b.ctaVi || null,
    cta_en: b.ctaEn || null,
    tone: b.tone,
    enabled: b.enabled,
    dismissible: b.dismissible,
    start_at: b.startAt,
    end_at: b.endAt,
    sort: b.sort ?? 0,
    updated_at: new Date().toISOString(),
  };
}

async function fetchBanners(): Promise<Banner[]> {
  const sb = supabase();
  if (!sb) return SEED_BANNERS;
  const { data, error } = await sb
    .from("banners")
    .select("*")
    .order("sort", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) {
    console.warn("[banners] Supabase fetch failed:", error.message);
    return SEED_BANNERS;
  }
  return (data as DbRow[]).map(rowToBanner);
}

const cached = unstable_cache(fetchBanners, ["banners:list"], {
  revalidate: 60,
  tags: ["banners"],
});

export async function getBanners(): Promise<Banner[]> {
  return cached();
}
