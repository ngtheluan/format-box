"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconApps, IconChevronDown, IconSearch, IconX } from "@tabler/icons-react";
import { TOOLS, toolSearchable, type Tool } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";

function score(tool: Tool, q: string): number {
  if (!q) return 1;
  const needle = q.toLowerCase();
  const hay = toolSearchable(tool);
  if (!hay.includes(needle)) return 0;
  let s = 1;
  if (tool.title.toLowerCase().startsWith(needle)) s += 8;
  else if (tool.title.toLowerCase().includes(needle)) s += 5;
  if (tool.tags.some((x) => x.toLowerCase() === needle)) s += 4;
  if (tool.sub.en.toLowerCase().includes(needle) || tool.sub.vi.toLowerCase().includes(needle)) s += 2;
  return s;
}

export default function ToolsMenu() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      // focus input after next paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

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

  const results = useMemo(() => {
    const query = q.trim();
    return TOOLS.map((t) => ({ tool: t, s: score(t, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.tool);
  }, [q]);

  useEffect(() => setActive(0), [q]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = results[active];
      if (t) {
        setOpen(false);
        router.push(t.href);
      }
    }
  };

  return (
    <div className={`tools-menu${open ? " open" : ""}`} ref={wrapRef}>
      <button
        className="tools-menu-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <IconApps size={16} stroke={1.8} />
        <span>{t("nav_tools")}</span>
        <IconChevronDown size={14} stroke={2} className="chev" />
      </button>

      <div className="tools-menu-panel" role="menu" hidden={!open}>
        <div className="tools-menu-search">
          <IconSearch size={15} stroke={1.9} />
          <input
            ref={inputRef}
            type="text"
            placeholder={t("nav_search_placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            spellCheck={false}
            autoComplete="off"
          />
          {q && (
            <button
              type="button"
              className="tools-menu-clear"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label="Xoá"
            >
              <IconX size={13} stroke={2} />
            </button>
          )}
        </div>

        <div className="tools-menu-head">
          <span>{q ? `${results.length} ${t("nav_results")}` : t("nav_all_tools")}</span>
          <span className="tools-menu-count">{results.length}</span>
        </div>

        {results.length === 0 ? (
          <div className="tools-menu-empty">
            {t("nav_no_result")} &quot;{q}&quot;
          </div>
        ) : (
          <div className="tools-menu-grid">
            {results.map((tool, i) => {
              const activeRow = pathname === tool.href;
              const highlight = i === active;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`tools-menu-item${activeRow ? " active" : ""}${
                    highlight ? " highlight" : ""
                  }`}
                  role="menuitem"
                  onMouseEnter={() => setActive(i)}
                >
                  <div className="tools-menu-icon">
                    <tool.Icon size={18} stroke={1.7} />
                  </div>
                  <div className="tools-menu-text">
                    <b>{tool.title}</b>
                    <span>{tool.sub[lang]}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
