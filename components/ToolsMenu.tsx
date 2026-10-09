"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconChevronDown } from "@tabler/icons-react";
import { CATEGORY_ORDER, type ToolCategory } from "@/lib/tools-shared";
import { useTools } from "@/components/ToolsProvider";
import { ToolIcon } from "@/lib/tool-icons";
import { useI18n } from "@/lib/i18n";

export default function ToolsMenu() {
  const { t, lang } = useI18n();
  const TOOLS = useTools();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [focusCat, setFocusCat] = useState<ToolCategory>(CATEGORY_ORDER[0]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const prefetched = useRef(new Set<string>());

  const visibleCats = useMemo(
    () => CATEGORY_ORDER.filter((c) => TOOLS.some((tt) => tt.category === c)),
    [TOOLS],
  );

  // Close on route change
  useEffect(() => setOpen(false), [pathname]);

  // Close on outside click / Escape; Arrow Left/Right to move focus between columns
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const idx = visibleCats.indexOf(focusCat);
        if (idx < 0) return;
        const next = e.key === "ArrowRight" ? idx + 1 : idx - 1;
        if (next >= 0 && next < visibleCats.length) {
          e.preventDefault();
          setFocusCat(visibleCats[next]);
        }
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, focusCat, visibleCats]);

  const prefetchCat = (cat: ToolCategory) => {
    TOOLS.filter((tt) => tt.category === cat).forEach((tool) => {
      if (!prefetched.current.has(tool.href)) {
        prefetched.current.add(tool.href);
        router.prefetch(tool.href);
      }
    });
  };

  const openOn = (c: ToolCategory) => {
    if (open && focusCat === c) {
      setOpen(false);
    } else {
      setFocusCat(c);
      setOpen(true);
    }
  };

  const totalCount = TOOLS.length;
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <div className="nav-cats" ref={wrapRef} data-open={open ? "1" : "0"}>
      {visibleCats.map((cat) => {
        const items = TOOLS.filter((tt) => tt.category === cat);
        const catActive = items.some((it) => it.href === pathname);
        const isFocus = open && focusCat === cat;
        return (
          <div key={cat} className={`nav-cat nav-cat-${cat}${isFocus ? " open" : ""}`}>
            <button
              type="button"
              className={`nav-cat-btn${catActive ? " active" : ""}`}
              aria-expanded={isFocus}
              aria-haspopup="menu"
              onMouseEnter={() => {
                prefetchCat(cat);
                if (open) setFocusCat(cat);
              }}
              onFocus={() => prefetchCat(cat)}
              onClick={() => openOn(cat)}
            >
              <span>{t(cat)}</span>
              <IconChevronDown size={12} stroke={2} className="chev" />
            </button>
          </div>
        );
      })}

      {open && (
        <div
          className="nav-mega"
          role="menu"
          style={{ ["--cols" as never]: visibleCats.length }}
        >
          <div className="nav-mega-grid">
            {visibleCats.map((cat) => {
              const items = TOOLS.filter((tt) => tt.category === cat);
              const isFocus = focusCat === cat;
              return (
                <div
                  key={cat}
                  className={`nav-mega-col nav-cat-${cat}${isFocus ? " is-focus" : ""}`}
                  onMouseEnter={() => setFocusCat(cat)}
                >
                  <div className="nav-cat-panel-head">
                    <span>{t(cat)}</span>
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
                          onClick={() => setOpen(false)}
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
              );
            })}
          </div>
          <div className="nav-mega-foot">
            <span className="nav-mega-foot-count">
              {totalCount} {lang === "vi" ? "công cụ" : "tools"}
            </span>
            <span className="nav-mega-foot-hints">
              <span>
                <kbd>←</kbd>
                <kbd>→</kbd>{" "}
                {lang === "vi" ? "chuyển cột" : "switch column"}
              </span>
              <span>
                <kbd>Esc</kbd> {lang === "vi" ? "đóng" : "close"}
              </span>
              <span>
                <kbd>{isMac ? "⌘" : "Ctrl"}</kbd>
                <kbd>K</kbd> {lang === "vi" ? "tìm kiếm" : "search"}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
