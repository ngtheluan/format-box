import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import { DICT } from "./i18n-dict";

export type TranslationMap = Record<string, { vi: string; en: string }>;

type DbRow = { key: string; vi: string | null; en: string | null };

async function fetchTranslations(): Promise<TranslationMap> {
  const sb = supabase();
  if (!sb) return {};
  const { data, error } = await sb.from("translations").select("key, vi, en");
  if (error) {
    console.warn("[translations] Supabase fetch failed:", error.message);
    return {};
  }
  const map: TranslationMap = {};
  for (const r of (data as DbRow[]) ?? []) {
    map[r.key] = { vi: r.vi ?? "", en: r.en ?? "" };
  }
  return map;
}

const cached = unstable_cache(fetchTranslations, ["translations:list"], {
  revalidate: 60,
  tags: ["translations"],
});

export async function getTranslations(): Promise<TranslationMap> {
  const db = await cached();
  // DB overrides DICT; keys only in DICT fall back to source.
  return { ...(DICT as TranslationMap), ...db };
}
