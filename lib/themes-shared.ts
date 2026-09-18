export type Theme = {
  id: string;
  nameVi: string;
  nameEn: string;
  descVi: string;
  descEn: string;
  swatch: [string, string];
  isDefault: boolean;
  enabled: boolean;
  sort: number;
};

export const SEED_THEMES: Theme[] = [
  {
    id: "modern",
    nameVi: "Hiện đại",
    nameEn: "Modern",
    descVi: "Mặc định — sạch, tối giản, dùng cả năm.",
    descEn: "Default — clean and minimal, all-year.",
    swatch: ["#6366f1", "#a78bfa"],
    isDefault: true,
    enabled: true,
    sort: 10,
  },
  {
    id: "mid-autumn",
    nameVi: "Trung thu",
    nameEn: "Mid-Autumn",
    descVi: "Trăng tròn, lồng đèn bay, tông đỏ vàng cho mùa Trung thu.",
    descEn: "Full moon, floating lanterns, red/gold for Mid-Autumn.",
    swatch: ["#e53935", "#f9a825"],
    isDefault: false,
    enabled: true,
    sort: 20,
  },
  {
    id: "christmas",
    nameVi: "Giáng sinh",
    nameEn: "Christmas",
    descVi: "Tuyết rơi, tông đỏ xanh, dành cho mùa Giáng sinh.",
    descEn: "Snowfall, red & green, for the Christmas season.",
    swatch: ["#c62828", "#2e7d32"],
    isDefault: false,
    enabled: true,
    sort: 30,
  },
  {
    id: "lunar-new-year",
    nameVi: "Tết",
    nameEn: "Lunar New Year",
    descVi: "Bao lì xì đỏ vàng, sparkle vàng cho Tết Nguyên đán.",
    descEn: "Red & gold envelopes, sparkle for Lunar New Year.",
    swatch: ["#d32f2f", "#f4b400"],
    isDefault: false,
    enabled: true,
    sort: 40,
  },
  {
    id: "halloween",
    nameVi: "Halloween",
    nameEn: "Halloween",
    descVi: "Trăng cam, dơi, sương tím cho mùa Halloween.",
    descEn: "Orange moon, bats and purple mist for Halloween.",
    swatch: ["#ef6c00", "#6a1b9a"],
    isDefault: false,
    enabled: true,
    sort: 50,
  },
];
