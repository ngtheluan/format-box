"use client";
import { useTools } from "@/components/ToolsProvider";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { ToolIcon } from "@/lib/tool-icons";
import { CATEGORY_ORDER, type ToolCategory } from "@/lib/tools-shared";
import { IconChevronDown } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const CAT_SHORT_LABEL: Record<ToolCategory, Record<Lang, string>> = {
  cat_text: { vi: "Văn bản", en: "Text" },
  cat_media: { vi: "Hình ảnh", en: "Media" },
  cat_dev: { vi: "Công cụ", en: "Dev" },
  cat_life: { vi: "Tiện ích", en: "Utilities" },
};

export default function ToolsMenu() {
  const { lang } = useI18n();
  const TOOLS = useTools();
  const router = useRouter();
  const [openCat, setOpenCat] = useState<ToolCategory | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const prefetched = useRef(new Set<string>());

  useEffect(() => setOpenCat(null), [pathname]);

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

  const prefetchCat = (cat: ToolCategory) => {
    TOOLS.filter((tt) => tt.category === cat).forEach((tool) => {
      if (!prefetched.current.has(tool.href)) {
        prefetched.current.add(tool.href);
        router.prefetch(tool.href);
      }
    });
  };

  return (
    <div className="nav-cats" ref={wrapRef}>
      {CATEGORY_ORDER.map((cat) => {
        const items = TOOLS.filter((tt) => tt.category === cat);
        if (items.length === 0) return null;
        const isOpen = openCat === cat;
        const isActive = items.some((it) => it.href === pathname);
        return (
          <div key={cat} className={`nav-cat nav-cat-${cat}${isOpen ? " open" : ""}`}>
            <button
              type="button"
              className={`nav-cat-btn${isActive ? " active" : ""}`}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              onMouseEnter={() => prefetchCat(cat)}
              onFocus={() => prefetchCat(cat)}
              onClick={() => setOpenCat((cur) => (cur === cat ? null : cat))}
            >
              <span>{CAT_SHORT_LABEL[cat][lang]}</span>
              <IconChevronDown size={14} stroke={2} className="chev" />
            </button>

            {isOpen && (
              <div className="nav-cat-panel" role="menu">
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
                          <ToolIcon name={tool.iconName} size={18} stroke={1.7} />
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
