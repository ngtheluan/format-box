"use client";
import { useEffect, useRef } from "react";
import { useTools } from "@/components/ToolsProvider";
import { useI18n } from "@/lib/i18n";
import { TOOL_SEO } from "@/lib/seo-tools";
import { ToolIcon } from "@/lib/tool-icons";

const SEO_SLUGS = new Set(Object.values(TOOL_SEO).map((s) => s.slug));

export function ToolHeader({ href, h1Style }: { href: string; h1Style?: React.CSSProperties }) {
  const tools = useTools();
  const { lang } = useI18n();

  // Count one view per tool page load (best-effort, deduped against re-renders).
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    try {
      const body = JSON.stringify({ href });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    } catch {}
  }, [href]);

  const tool = tools.find((t) => t.href === href);

  useEffect(() => {
    if (typeof document === "undefined" || !tool) return;
    if (SEO_SLUGS.has(href)) return; // pages with own SEO metadata keep server title
    const want = `${tool.title} · FormatBox`;
    document.title = want;
    const headTitle = document.querySelector("head > title");
    if (!headTitle) return;
    const obs = new MutationObserver(() => {
      if (document.title !== want) document.title = want;
    });
    obs.observe(headTitle, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, [tool, href]);

  if (!tool) return null;
  return (
    <>
      <h1 className="page-title" style={h1Style}>
        <ToolIcon name={tool.iconName} size={22} stroke={1.8} />
        {tool.title}
        {tool.sub[lang] && <span>{tool.sub[lang]}</span>}
      </h1>
      {tool.desc[lang] && <p className="sub">{tool.desc[lang]}</p>}
    </>
  );
}
