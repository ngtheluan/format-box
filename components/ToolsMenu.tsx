"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChevronDown, IconApps } from "@tabler/icons-react";
import { TOOLS } from "@/lib/tools";

export default function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`tools-menu${open ? " open" : ""}`} ref={wrapRef}>
      <button
        className="tools-menu-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <IconApps size={16} stroke={1.8} />
        <span>Công cụ</span>
        <IconChevronDown size={14} stroke={2} className="chev" />
      </button>

      <div className="tools-menu-panel" role="menu" hidden={!open}>
        <div className="tools-menu-head">
          <span>All tools</span>
          <span className="tools-menu-count">{TOOLS.length}</span>
        </div>
        <div className="tools-menu-grid">
          {TOOLS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`tools-menu-item${active ? " active" : ""}`}
                role="menuitem"
              >
                <div className="tools-menu-icon">
                  <t.Icon size={18} stroke={1.7} />
                </div>
                <div className="tools-menu-text">
                  <b>{t.title}</b>
                  <span>{t.sub}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
