"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChevronDown } from "@tabler/icons-react";
import { CATEGORY_ORDER, TOOLS, type ToolCategory } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";

const catKey = (c: ToolCategory) => c;

export default function ToolsMenu() {
  const { t, lang } = useI18n();
  const [openCat, setOpenCat] = useState<ToolCategory | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => setOpenCat(null), [pathname]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!openCat) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenCat(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenCat(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openCat]);

  const toggle = (c: ToolCategory) => setOpenCat((cur) => (cur === c ? null : c));

  return (
    <div className="nav-cats" ref={wrapRef}>
      {CATEGORY_ORDER.map((cat) => {
        const items = TOOLS.filter((tt) => tt.category === cat);
        if (items.length === 0) return null;
        const isOpen = openCat === cat;
        const catActive = items.some((it) => it.href === pathname);
        return (
          <div key={cat} className={`nav-cat nav-cat-${cat}${isOpen ? " open" : ""}`}>
            <button
              type="button"
              className={`nav-cat-btn${catActive ? " active" : ""}`}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              onClick={() => toggle(cat)}
            >
              <span>{t(catKey(cat))}</span>
              <IconChevronDown size={12} stroke={2} className="chev" />
            </button>

            {isOpen && (
              <div className="nav-cat-panel" role="menu">
                <div className="nav-cat-panel-head">
                  <span>{t(catKey(cat))}</span>
                  <span className="nav-cat-panel-count">{items.length}</span>
                </div>
                <div className="nav-cat-list">
                  {items.map((tool) => {
                    const active = pathname === tool.href;
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className={`nav-cat-item${active ? " active" : ""}`}
                        role="menuitem"
                      >
                        <div className="nav-cat-item-icon">
                          <tool.Icon size={18} stroke={1.7} />
                        </div>
                        <div className="nav-cat-item-text">
                          <b>{tool.title}</b>
                          <span>{tool.sub[lang]}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
