import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import type { Tool } from "./tools-shared";

export * from "./tools-shared";

type DbRow = {
  href: string;
  icon_name: string;
  title: string;
  sub_vi: string;
  sub_en: string;
  desc_vi: string;
  desc_en: string;
  tags: string[] | null;
  category: Tool["category"];
  sort: number | null;
  active: boolean | null;
};

function rowToTool(r: DbRow): Tool {
  return {
    href: r.href,
    iconName: r.icon_name,
    title: r.title,
    sub: { vi: r.sub_vi, en: r.sub_en },
    desc: { vi: r.desc_vi, en: r.desc_en },
    tags: r.tags ?? [],
    category: r.category,
    sort: r.sort ?? 0,
    active: r.active ?? true,
  };
}

export function toolToRow(t: Tool): DbRow {
  return {
    href: t.href,
    icon_name: t.iconName,
    title: t.title,
    sub_vi: t.sub.vi,
    sub_en: t.sub.en,
    desc_vi: t.desc.vi,
    desc_en: t.desc.en,
    tags: t.tags,
    category: t.category,
    sort: t.sort ?? 0,
    active: t.active ?? true,
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
