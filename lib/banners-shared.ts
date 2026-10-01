import type { Lang } from "./i18n";

export type BannerTone = "info" | "success" | "warning" | "danger";

export const BANNER_TONES: BannerTone[] = ["info", "success", "warning", "danger"];

export const BANNER_TONE_LABEL: Record<BannerTone, string> = {
  info: "Thông tin",
  success: "Thành công",
  warning: "Cảnh báo",
  danger: "Khẩn cấp",
};

export type Banner = {
  id: string;
  messageVi: string;
  messageEn: string;
  href: string;       // optional CTA link, "" = no link
  ctaVi: string;      // optional CTA label
  ctaEn: string;
  tone: BannerTone;
  enabled: boolean;
  dismissible: boolean;
  startAt: string | null; // ISO, null = no lower bound
  endAt: string | null;   // ISO, null = no upper bound
  sort: number;
  updatedAt: string;  // ISO; also the dismissal cache-buster key
};

export const bannerMessage = (b: Banner, lang: Lang) =>
  (lang === "en" ? b.messageEn : b.messageVi) || b.messageVi || b.messageEn;

export const bannerCta = (b: Banner, lang: Lang) =>
  lang === "en" ? b.ctaEn : b.ctaVi;

/**
 * A banner shows only while enabled AND the current time falls inside its
 * [startAt, endAt] window. Null bounds mean "open-ended" on that side.
 */
export function isBannerLive(b: Banner, now: number = Date.now()): boolean {
  if (!b.enabled) return false;
  if (b.startAt && now < Date.parse(b.startAt)) return false;
  if (b.endAt && now > Date.parse(b.endAt)) return false;
  return true;
}

// Higher sort first, then most recently updated — the one shown at the top.
export function sortBanners(list: Banner[]): Banner[] {
  return [...list].sort(
    (a, b) => b.sort - a.sort || Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

// Empty seed — banners are created on demand by admins.
export const SEED_BANNERS: Banner[] = [];
