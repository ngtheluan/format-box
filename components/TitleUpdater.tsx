"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTools } from "@/components/ToolsProvider";
import { SEO_SLUGS } from "@/lib/tools-shared";

const BASE = "FormatBox";
const HOME_TITLE = "FormatBox — Chuyển đổi dữ liệu ngay trên trình duyệt";

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
