import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import { SEED_THEMES, type Theme } from "./themes-shared";

export * from "./themes-shared";

type DbRow = {
  id: string;
  name_vi: string;
  name_en: string;
  desc_vi: string | null;
  desc_en: string | null;
  swatch_from: string | null;
  swatch_to: string | null;
  is_default: boolean | null;
  enabled: boolean | null;
  sort: number | null;
};

function rowToTheme(r: DbRow): Theme {
  return {
    id: r.id,
    nameVi: r.name_vi,
    nameEn: r.name_en,
    descVi: r.desc_vi ?? "",
    descEn: r.desc_en ?? "",
    swatch: [r.swatch_from ?? "#6366f1", r.swatch_to ?? "#a78bfa"],
    isDefault: r.is_default ?? false,
    enabled: r.enabled ?? true,
    sort: r.sort ?? 0,
  };
}

export function themeToRow(t: Theme): DbRow {
  return {
    id: t.id,
    name_vi: t.nameVi,
    name_en: t.nameEn,
    desc_vi: t.descVi,
    desc_en: t.descEn,
    swatch_from: t.swatch[0],
    swatch_to: t.swatch[1],
    is_default: t.isDefault,
    enabled: t.enabled,
    sort: t.sort ?? 0,
  };
}

async function fetchThemes(): Promise<Theme[]> {
  const sb = supabase();
  if (!sb) return SEED_THEMES;
  const { data, error } = await sb
    .from("themes")
    .select("*")
    .order("sort", { ascending: true })
    .order("name_vi", { ascending: true });
  if (error) {
    console.warn("[themes] Supabase fetch failed:", error.message);
    return SEED_THEMES;
  }
  return (data as DbRow[]).map(rowToTheme);
}

const cached = unstable_cache(fetchThemes, ["themes:list"], {
  revalidate: 60,
  tags: ["themes"],
});

export async function getThemes(): Promise<Theme[]> {
  return cached();
}
