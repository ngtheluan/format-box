import { unstable_cache } from "next/cache";
import { supabase, supabaseAdmin, hasSupabase } from "./supabase";
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

async function fetchSortMode(): Promise<"custom" | "alpha-asc" | "alpha-desc"> {
  if (!hasSupabase()) return "custom";
  try {
    const { data } = await supabaseAdmin()
      .from("app_settings")
      .select("value")
      .eq("key", "menu_sort_mode")
      .maybeSingle();
    const v = data?.value;
    return v === "alpha-asc" || v === "alpha-desc" || v === "custom" ? v : "custom";
  } catch {
    return "custom";
  }
}

// Columns the public menu actually needs. Heavy content fields
// (intro_*, features_*, faqs_*, seo_*) are dropped on purpose — they would
// bloat every /api/tools response but are only consumed on individual tool
// pages, which read them from SEED_TOOLS (compiled into the bundle).
const MENU_COLUMNS =
  "href, icon_name, title, desc_vi, desc_en, tags, category, sort, active, visible_guest, visible_user";

type MenuRow = Pick<
  DbRow,
  | "href"
  | "icon_name"
  | "title"
  | "desc_vi"
  | "desc_en"
  | "tags"
  | "category"
  | "sort"
  | "active"
  | "visible_guest"
  | "visible_user"
>;

function menuRowToTool(r: MenuRow): Tool {
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
    intro: { vi: "", en: "" },
    features: { vi: [], en: [] },
    faqs: { vi: [], en: [] },
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
    .select(MENU_COLUMNS)
    .eq("active", true)
    .order("sort", { ascending: true })
    .order("title", { ascending: true });
  if (error) {
    console.warn("[tools] Supabase fetch failed:", error.message);
    return [];
  }
  const tools = (data as unknown as MenuRow[]).map(menuRowToTool);
  const mode = await fetchSortMode();
  if (mode === "custom") return tools;
  const sorted = [...tools].sort((a, b) => a.title.localeCompare(b.title, "vi"));
  if (mode === "alpha-desc") sorted.reverse();
  return sorted;
}

const cached = unstable_cache(fetchTools, ["tools:list"], {
  revalidate: 60,
  tags: ["tools"],
});

export async function getTools(): Promise<Tool[]> {
  return cached();
}
