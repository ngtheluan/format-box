"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconChevronDown,
  IconLayoutGrid,
  IconSearch,
  IconArrowRight,
  IconCornerDownLeft,
} from "@tabler/icons-react";
import { CATEGORY_ORDER, toolSearchable, type ToolCategory } from "@/lib/tools-shared";
import { useTools } from "@/components/ToolsProvider";
import { ToolIcon } from "@/lib/tool-icons";
import { useI18n } from "@/lib/i18n";

export default function ToolsMenu() {
  const { t, lang } = useI18n();
  const TOOLS = useTools();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<ToolCategory>(CATEGORY_ORDER[0]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefetched = useRef(false);

  // Close + reset on route change
  useEffect(() => {
    setOpen(false);
    setQ("");
  }, [pathname]);

  // Focus filter + prefetch all tools once opened
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    if (!prefetched.current) {
      prefetched.current = true;
      TOOLS.forEach((tool) => router.prefetch(tool.href));
    }
    return () => cancelAnimationFrame(id);
  }, [open, TOOLS, router]);

  // Close on outside click / Escape
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

  const query = q.trim().toLowerCase();
  const searching = query.length > 0;

  const countByCat = useMemo(() => {
    const m = {} as Record<ToolCategory, number>;
    CATEGORY_ORDER.forEach((c) => (m[c] = 0));
    TOOLS.forEach((tool) => (m[tool.category] = (m[tool.category] ?? 0) + 1));
    return m;
  }, [TOOLS]);

  const results = useMemo(
    () => (searching ? TOOLS.filter((tool) => toolSearchable(tool).includes(query)) : []),
    [TOOLS, query, searching]
  );

  // Tools shown in the right pane
  const shown = searching ? results : TOOLS.filter((tool) => tool.category === activeCat);

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  return (
    <div className={`tm${open ? " open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="tm-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <IconLayoutGrid size={16} stroke={1.8} className="tm-trigger-icon" />
        <span>{t("nav_tools")}</span>
        <IconChevronDown size={13} stroke={2} className="tm-chev" />
      </button>

      {open && (
        <div className="tm-panel" role="menu">
          <div className="tm-search">
            <IconSearch size={17} stroke={1.8} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && shown[0]) go(shown[0].href);
              }}
              placeholder={t("nav_search_placeholder")}
              aria-label={t("nav_search_placeholder")}
            />
            {searching && (
              <kbd className="tm-kbd">
                <IconCornerDownLeft size={12} stroke={2} />
              </kbd>
            )}
          </div>

          <div className="tm-body">
            {!searching && (
              <nav className="tm-rail" aria-label={t("nav_tools")}>
                {CATEGORY_ORDER.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`tm-rail-btn tm-${cat}${cat === activeCat ? " active" : ""}`}
                    onMouseEnter={() => setActiveCat(cat)}
                    onClick={() => setActiveCat(cat)}
                  >
                    <span className="tm-rail-dot" />
                    <span className="tm-rail-name">{t(cat as ToolCategory)}</span>
                    <span className="tm-rail-count">{countByCat[cat]}</span>
                  </button>
                ))}
              </nav>
            )}

            <div className={`tm-pane${searching ? " searching" : ` tm-${activeCat}`}`}>
              {searching && (
                <div className="tm-pane-head">
                  {results.length} {t("nav_results")}
                </div>
              )}
              {shown.length === 0 ? (
                <div className="tm-empty">
                  {searching ? `${t("nav_no_result")} “${q.trim()}”` : "…"}
                </div>
              ) : (
                <div className="tm-grid">
                  {shown.map((tool) => {
                    const active = pathname === tool.href;
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className={`tm-card tm-${tool.category}${active ? " active" : ""}`}
                        role="menuitem"
                        onClick={() => setOpen(false)}
                      >
                        <span className="tm-card-icon">
                          <ToolIcon name={tool.iconName} size={19} stroke={1.7} />
                        </span>
                        <span className="tm-card-text">
                          <b>{tool.title}</b>
                          <small>{tool.sub[lang]}</small>
                        </span>
                        <IconArrowRight size={15} stroke={1.9} className="tm-card-go" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
