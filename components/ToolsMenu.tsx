"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconChevronDown, IconLayoutGrid, IconSearch, IconArrowRight } from "@tabler/icons-react";
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefetched = useRef(false);

  // Close + reset query on route change
  useEffect(() => {
    setOpen(false);
    setQ("");
  }, [pathname]);

  // Focus the filter and prefetch every tool once opened
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
  const matches = useMemo(() => {
    if (!query) return TOOLS;
    return TOOLS.filter((tool) => toolSearchable(tool).includes(query));
  }, [TOOLS, query]);

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        cat,
        items: matches.filter((tool) => tool.category === cat),
      })).filter((g) => g.items.length > 0),
    [matches]
  );

  const goFirst = () => {
    if (matches[0]) router.push(matches[0].href);
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
            <IconSearch size={16} stroke={1.8} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goFirst();
              }}
              placeholder={t("nav_search_placeholder")}
              aria-label={t("nav_search_placeholder")}
            />
            <span className="tm-count">
              {matches.length} {query ? t("nav_results") : t("nav_all_tools")}
            </span>
          </div>

          {grouped.length === 0 ? (
            <div className="tm-empty">
              {t("nav_no_result")} “{q.trim()}”
            </div>
          ) : (
            <div className="tm-grid">
              {grouped.map(({ cat, items }) => (
                <section key={cat} className={`tm-col tm-${cat}`}>
                  <header className="tm-col-head">
                    <span className="tm-dot" />
                    <span className="tm-col-title">{t(cat as ToolCategory)}</span>
                    <span className="tm-col-count">{items.length}</span>
                  </header>
                  <div className="tm-list">
                    {items.map((tool) => {
                      const active = pathname === tool.href;
                      return (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          className={`tm-item${active ? " active" : ""}`}
                          role="menuitem"
                        >
                          <span className="tm-item-icon">
                            <ToolIcon name={tool.iconName} size={17} stroke={1.7} />
                          </span>
                          <span className="tm-item-text">
                            <b>{tool.title}</b>
                            <small>{tool.sub[lang]}</small>
                          </span>
                          <IconArrowRight size={15} stroke={1.8} className="tm-item-go" />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
