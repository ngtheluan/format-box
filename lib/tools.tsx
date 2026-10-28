import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import type { BilingualFaqs, FaqItem, Tool } from "./tools-shared";

export * from "./tools-shared";

type JsonList = string[] | null;
type JsonFaqs = FaqItem[] | null;

type DbRow = {
  href: string;
  icon_name: string;
  title: string;
  desc_vi: string;
  desc_en: string;
  tags: string[] | null;
  category: Tool["category"];
  sort: number | null;
  active: boolean | null;
  visible_guest: boolean | null;
  visible_user: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  intro_vi: string | null;
  intro_en: string | null;
  features_vi: JsonList;
  features_en: JsonList;
  faqs_vi: JsonFaqs;
  faqs_en: JsonFaqs;
};

function cleanFaqs(list: JsonFaqs): FaqItem[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((f) => ({ q: (f?.q ?? "").toString(), a: (f?.a ?? "").toString() }))
    .filter((f) => f.q || f.a);
}

function rowToTool(r: DbRow): Tool {
  const faqs: BilingualFaqs = { vi: cleanFaqs(r.faqs_vi), en: cleanFaqs(r.faqs_en) };
  return {
    href: r.href,
    iconName: r.icon_name,
    title: r.title,
    desc: { vi: r.desc_vi, en: r.desc_en },
    tags: r.tags ?? [],
    category: r.category,
    sort: r.sort ?? 0,
    active: r.active ?? true,
    visibleGuest: r.visible_guest ?? true,
    visibleUser: r.visible_user ?? true,
    seoTitle: r.seo_title ?? undefined,
    seoDescription: r.seo_description ?? undefined,
    seoKeywords: r.seo_keywords ?? undefined,
    intro: { vi: r.intro_vi ?? "", en: r.intro_en ?? "" },
    features: { vi: r.features_vi ?? [], en: r.features_en ?? [] },
    faqs,
  };
}

export function toolToRow(t: Tool): DbRow {
  return {
    href: t.href,
    icon_name: t.iconName,
    title: t.title,
    desc_vi: t.desc.vi,
    desc_en: t.desc.en,
    tags: t.tags,
    category: t.category,
    sort: t.sort ?? 0,
    active: t.active ?? true,
    visible_guest: t.visibleGuest ?? true,
    visible_user: t.visibleUser ?? true,
    seo_title: t.seoTitle ?? null,
    seo_description: t.seoDescription ?? null,
    seo_keywords: t.seoKeywords ?? null,
    intro_vi: t.intro?.vi ?? null,
    intro_en: t.intro?.en ?? null,
    features_vi: t.features?.vi ?? null,
    features_en: t.features?.en ?? null,
    faqs_vi: t.faqs?.vi ?? null,
    faqs_en: t.faqs?.en ?? null,
  };
}

async function fetchTools(): Promise<Tool[]> {
  const sb = supabase();
  if (!sb) {
    console.warn("[tools] Supabase not configured — returning empty menu");
    return [];
  }
  const { data, error } = await sb
    .from("tools")
    .select("*")
    .eq("active", true)
    .order("sort", { ascending: true })
    .order("title", { ascending: true });
  if (error) {
    console.warn("[tools] Supabase fetch failed:", error.message);
    return [];
  }
  return (data as DbRow[]).map(rowToTool);
}

const cached = unstable_cache(fetchTools, ["tools:list"], {
  revalidate: 60,
  tags: ["tools"],
});

export async function getTools(): Promise<Tool[]> {
  return cached();
}
