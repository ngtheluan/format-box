"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { IconSearch, IconCornerDownLeft, IconArrowsMoveVertical, IconX } from "@tabler/icons-react";
import { TOOLS, type Tool } from "@/lib/tools";

type Ctx = { open: () => void; close: () => void; toggle: () => void; isOpen: boolean };
const PaletteCtx = createContext<Ctx | null>(null);
export const useCommandPalette = () => {
  const v = useContext(PaletteCtx);
  if (!v) throw new Error("useCommandPalette outside provider");
  return v;
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

function score(tool: Tool, q: string): number {
  if (!q) return 1;
  const needle = q.toLowerCase();
  const hay = [tool.title, tool.sub, tool.desc, tool.href, ...tool.tags]
    .join(" ")
    .toLowerCase();
  if (!hay.includes(needle)) return 0;
  let s = 1;
  if (tool.title.toLowerCase().startsWith(needle)) s += 8;
  else if (tool.title.toLowerCase().includes(needle)) s += 5;
  if (tool.tags.some((t) => t.toLowerCase() === needle)) s += 4;
  if (tool.sub.toLowerCase().includes(needle)) s += 2;
  return s;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const ctx = useMemo(() => ({ open, close, toggle, isOpen }), [open, close, toggle, isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault();
        toggle();
      } else if (key === "escape" && isOpen) {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle, close, isOpen]);

  return (
    <PaletteCtx.Provider value={ctx}>
      {children}
      {isOpen && <Palette onClose={close} />}
    </PaletteCtx.Provider>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const query = q.trim();
    return TOOLS.map((t) => ({ tool: t, s: score(t, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.tool);
  }, [q]);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (tool: Tool) => {
    onClose();
    router.push(tool.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = results[active];
      if (t) go(t);
    }
  };

  return (
    <div className="cp-overlay" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="cp-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cp-input-row">
          <IconSearch size={18} stroke={1.8} />
          <input
            ref={inputRef}
            className="cp-input"
            placeholder="Tìm công cụ, tính năng..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
          />
          <button className="cp-close" onClick={onClose} aria-label="Đóng">
            <IconX size={16} stroke={1.8} />
          </button>
        </div>

        <div className="cp-list" ref={listRef}>
          {results.length === 0 ? (
            <div className="cp-empty">Không tìm thấy công cụ nào cho &quot;{q}&quot;</div>
          ) : (
            <>
              <div className="cp-section">CÔNG CỤ</div>
              {results.map((t, i) => (
                <button
                  key={t.href}
                  data-idx={i}
                  className={`cp-item${i === active ? " active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(t)}
                >
                  <div className="cp-item-icon">
                    <t.Icon size={18} stroke={1.7} />
                  </div>
                  <div className="cp-item-text">
                    <b>{t.title}</b>
                    <span>{t.sub}</span>
                  </div>
                  <span className="cp-item-path">{t.href}</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="cp-footer">
          <span className="cp-hint">
            <kbd><IconArrowsMoveVertical size={11} stroke={2} /></kbd> di chuyển
          </span>
          <span className="cp-hint">
            <kbd><IconCornerDownLeft size={11} stroke={2} /></kbd> chọn
          </span>
          <span className="cp-hint">
            <kbd>esc</kbd> đóng
          </span>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteTrigger() {
  const { open } = useCommandPalette();
  return (
    <button
      className="cp-trigger"
      onClick={open}
      aria-label="Tìm kiếm công cụ"
      title="Tìm kiếm (⌘K)"
    >
      <IconSearch size={15} stroke={1.8} />
      <span>Tìm kiếm</span>
      <kbd className="cp-kbd">{isMac ? "⌘" : "Ctrl"} K</kbd>
    </button>
  );
}
