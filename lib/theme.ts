// Runs before React hydrates so the theme applies without a flash.
// Reads the user's saved skin, falling back to the site-wide default the
// admin panel writes to `fb-skin-default`.
export const themeInitScript = `
(function(){try{
  var t=localStorage.getItem('fb-theme');if(t){document.documentElement.dataset.theme=t;}
  var s=localStorage.getItem('fb-skin')||localStorage.getItem('fb-skin-default');
  if(s&&s!=='modern'){document.documentElement.dataset.skin=s;}
}catch(e){}})();
`;

export type Skin = "modern" | "mid-autumn" | "christmas" | "lunar-new-year" | "halloween";

export const SKINS: { id: Skin; vi: string; en: string; swatch: [string, string] }[] = [
  { id: "modern", vi: "Hiện đại", en: "Modern", swatch: ["#6366f1", "#a78bfa"] },
  { id: "mid-autumn", vi: "Trung thu", en: "Mid-Autumn", swatch: ["#e53935", "#f9a825"] },
  { id: "christmas", vi: "Giáng sinh", en: "Christmas", swatch: ["#c62828", "#2e7d32"] },
  { id: "lunar-new-year", vi: "Tết", en: "Lunar New Year", swatch: ["#d32f2f", "#f4b400"] },
  { id: "halloween", vi: "Halloween", en: "Halloween", swatch: ["#ef6c00", "#6a1b9a"] },
];

export const SKIN_DESCRIPTIONS: Record<Skin, { vi: string; en: string }> = {
  modern: { vi: "Mặc định — sạch, tối giản, dùng cả năm.", en: "Default — clean and minimal, all-year." },
  "mid-autumn": {
    vi: "Trăng tròn, lồng đèn bay, tông đỏ vàng cho mùa Trung thu.",
    en: "Full moon, floating lanterns, red/gold for Mid-Autumn.",
  },
  christmas: {
    vi: "Tuyết rơi, tông đỏ xanh, dành cho mùa Giáng sinh.",
    en: "Snowfall, red & green, for the Christmas season.",
  },
  "lunar-new-year": {
    vi: "Bao lì xì đỏ vàng, sparkle vàng cho Tết Nguyên đán.",
    en: "Red & gold envelopes, sparkle for Lunar New Year.",
  },
  halloween: {
    vi: "Trăng cam, dơi, sương tím cho mùa Halloween.",
    en: "Orange moon, bats and purple mist for Halloween.",
  },
};

export const SKIN_STORAGE = {
  userChoice: "fb-skin",
  default: "fb-skin-default",
  enabled: "fb-skin-enabled",
} as const;

export function readEnabledSkins(): Skin[] {
  try {
    const raw = localStorage.getItem(SKIN_STORAGE.enabled);
    if (!raw) return SKINS.map((s) => s.id);
    const parsed = JSON.parse(raw) as string[];
    const valid = SKINS.map((s) => s.id) as string[];
    const filtered = parsed.filter((x): x is Skin => valid.includes(x));
    return filtered.includes("modern") ? filtered : (["modern", ...filtered] as Skin[]);
  } catch {
    return SKINS.map((s) => s.id);
  }
}
