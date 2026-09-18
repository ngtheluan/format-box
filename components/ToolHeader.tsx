"use client";
import { useEffect, useRef } from "react";
import { useTools } from "@/components/ToolsProvider";
import { useI18n } from "@/lib/i18n";
import { ToolIcon } from "@/lib/tool-icons";

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
