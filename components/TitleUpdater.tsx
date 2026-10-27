"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTools } from "@/components/ToolsProvider";
import { TOOL_SEO } from "@/lib/seo-tools";

const BASE = "FormatBox";
const HOME_TITLE = "FormatBox — Chuyển đổi dữ liệu ngay trên trình duyệt";
const SEO_SLUGS = new Set(Object.values(TOOL_SEO).map((s) => s.slug));

export default function TitleUpdater() {
  const pathname = usePathname();
  const TOOLS = useTools();
  useEffect(() => {
    // Pages with their own SEO metadata keep their server-rendered <title>.
    if (SEO_SLUGS.has(pathname)) return;
    const tool = TOOLS.find((t) => t.href === pathname);
    document.title = tool ? `${BASE} — ${tool.title}` : HOME_TITLE;
  }, [pathname, TOOLS]);
  return null;
}
