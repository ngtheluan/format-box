"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  IconCornerDownLeft,
  IconSearch,
  IconX,
  IconArrowsMoveVertical,
} from "@tabler/icons-react";
import { CATEGORY_ORDER, toolSearchable, type Tool, type ToolCategory } from "@/lib/tools-shared";
import { useTools } from "@/components/ToolsProvider";
import { ToolIcon } from "@/lib/tool-icons";
import { useI18n } from "@/lib/i18n";

const catKey = (c: ToolCategory) => c;

function score(tool: Tool, q: string): number {
  if (!q) return 1;
  const needle = q.toLowerCase();
  const hay = toolSearchable(tool);
  if (!hay.includes(needle)) return 0;
  let s = 1;
  if (tool.title.toLowerCase().startsWith(needle)) s += 8;
  else if (tool.title.toLowerCase().includes(needle)) s += 5;
  if (tool.tags.some((x) => x.toLowerCase() === needle)) s += 4;
  if (tool.sub.en.toLowerCase().includes(needle) || tool.sub.vi.toLowerCase().includes(needle))
    s += 2;
  return s;
}

export default function SearchPalette() {
  const { t, lang } = useI18n();
  const TOOLS = useTools();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
    setMounted(true);
  }, []);

  // Cmd/Ctrl+K to toggle + Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Reset + focus + lock scroll when opened
  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const results = useMemo(() => {
    const query = q.trim();
    return TOOLS.map((tool) => ({ tool, s: score(tool, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.tool);
  }, [q, TOOLS]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const go = (tool: Tool) => {
    setOpen(false);
    router.push(tool.href);
  };

  const renderItem = (tool: Tool, i: number) => (
    <button
      key={tool.href}
      data-idx={i}
      type="button"
      className={`sp-item sp-item-${tool.category}${i === active ? " active" : ""}`}
      onMouseEnter={() => setActive(i)}
      onClick={() => go(tool)}
    >
      <div className="sp-item-icon">
        <ToolIcon name={tool.iconName} size={18} stroke={1.7} />
      </div>
      <div className="sp-item-body">
        <b>{tool.title}</b>
        <span>{tool.sub[lang]}</span>
      </div>
      <span className="sp-item-path">{tool.href}</span>
    </button>
  );

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const tool = results[active];
      if (tool) go(tool);
    }
  };

  return (
    <>
      <button
        type="button"
        className="sp-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={t("nav_search_placeholder")}
        title={t("nav_search_placeholder")}
      >
        <IconSearch size={15} stroke={1.9} />
        <span>{t("nav_search_placeholder")}</span>
        <kbd className="sp-kbd">{isMac ? "⌘" : "Ctrl"} K</kbd>
      </button>

      {open && mounted && createPortal(
        <div
          className="sp-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-input-row">
              <IconSearch size={18} stroke={1.9} />
              <input
                ref={inputRef}
                className="sp-input"
                type="text"
                placeholder={t("nav_search_placeholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onInputKey}
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="button"
                className="sp-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <IconX size={15} stroke={2} />
              </button>
            </div>

            <div className="sp-list" ref={listRef}>
              {results.length === 0 ? (
                <div className="sp-empty">
                  {t("nav_no_result")} &quot;{q}&quot;
                </div>
              ) : q ? (
                <>
                  <div className="sp-section">
                    {results.length} {t("nav_results")}
                  </div>
                  {results.map((tool, i) => renderItem(tool, i))}
                </>
              ) : (
                CATEGORY_ORDER.map((cat) => {
                  const items = results.filter((tt) => tt.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} className={`sp-group sp-group-${cat}`}>
                      <div className="sp-section sp-group-head">
                        <span>{t(catKey(cat))}</span>
                        <span className="sp-group-count">{items.length}</span>
                      </div>
                      {items.map((tool) => renderItem(tool, results.indexOf(tool)))}
                    </div>
                  );
                })
              )}
            </div>

            <div className="sp-footer">
              <span className="sp-hint">
                <kbd>
                  <IconArrowsMoveVertical size={11} stroke={2} />
                </kbd>{" "}
                di chuyển
              </span>
              <span className="sp-hint">
                <kbd>
                  <IconCornerDownLeft size={11} stroke={2} />
                </kbd>{" "}
                chọn
              </span>
              <span className="sp-hint">
                <kbd>esc</kbd> đóng
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
