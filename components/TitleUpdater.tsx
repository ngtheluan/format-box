"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTools } from "@/components/ToolsProvider";
import { SEO_SLUGS } from "@/lib/tools-shared";
import { useI18n } from "@/lib/i18n";

const BASE = "FormatBox";
const HOME_TITLE = "FormatBox — Bộ công cụ trực tuyến miễn phí";

export default function TitleUpdater() {
  const pathname = usePathname();
  const TOOLS = useTools();
  const { lang } = useI18n();
  useEffect(() => {
    // Pages with their own SEO metadata keep their server-rendered <title>.
    if (SEO_SLUGS.has(pathname)) return;
    const tool = TOOLS.find((t) => t.href === pathname);
    document.title = tool ? `${BASE} — ${tool.title[lang]}` : HOME_TITLE;
  }, [pathname, TOOLS, lang]);
  return null;
}
