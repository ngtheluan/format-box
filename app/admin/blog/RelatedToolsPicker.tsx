"use client";

import { useMemo, useState } from "react";
import { IconCheck, IconSearch, IconSparkles, IconX } from "@tabler/icons-react";
import { useTools } from "@/components/ToolsProvider";
import { relatedTools } from "@/lib/tools-shared";
import { ToolIcon } from "@/lib/tool-icons";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  // Context for the "auto-suggest" button.
  title?: string;
  tags?: string[];
  max?: number;
};

// Pick the tools shown in a post's "Công cụ liên quan" block: one click to
// auto-suggest from the title/tags, plus manual toggle of any tool.
export default function RelatedToolsPicker({ value, onChange, title, tags, max = 6 }: Props) {
  const tools = useTools();
  const [q, setQ] = useState("");

  const byHref = useMemo(() => new Map(tools.map((t) => [t.href, t])), [tools]);
  const selected = value.map((h) => byHref.get(h)).filter(Boolean) as ReturnType<typeof useTools>;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = tools.filter((t) => (t.active ?? true) !== false);
    if (!needle) return list;
    return list.filter((t) => `${t.title} ${t.href} ${t.tags.join(" ")}`.toLowerCase().includes(needle));
  }, [tools, q]);

  function toggle(href: string) {
    if (value.includes(href)) onChange(value.filter((h) => h !== href));
    else if (value.length < max) onChange([...value, href]);
  }

  function autoSuggest() {
    const sug = relatedTools(tools, { title: title || "", tags: tags || [] }, 3).map((t) => t.href);
    onChange(Array.from(new Set([...value, ...sug])).slice(0, max));
  }

  return (
    <div className="bga-reltools">
      <div className="bga-reltools-head">
        <span className="bga-reltools-count">
          Đã chọn {value.length}/{max}
        </span>
        <button type="button" className="bga-reltools-auto" onClick={autoSuggest}>
          <IconSparkles size={14} stroke={1.8} /> Sinh tự động
        </button>
      </div>

      {selected.length > 0 && (
        <div className="bga-reltools-chips">
          {selected.map((t) => (
            <span key={t.href} className="bga-reltools-chip">
              <ToolIcon name={t.iconName} size={14} stroke={1.8} />
              {t.title}
              <button type="button" onClick={() => toggle(t.href)} aria-label={`Bỏ ${t.title}`}>
                <IconX size={12} stroke={2.2} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="bga-reltools-search">
        <IconSearch size={14} stroke={1.8} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm công cụ…" />
      </div>

      <div className="bga-reltools-grid">
        {filtered.map((t) => {
          const on = value.includes(t.href);
          const full = !on && value.length >= max;
          return (
            <button
              key={t.href}
              type="button"
              className={`bga-reltools-opt${on ? " is-on" : ""}`}
              onClick={() => toggle(t.href)}
              disabled={full}
              aria-pressed={on}
              title={full ? `Tối đa ${max} công cụ` : t.title}
            >
              <span className="bga-reltools-opt-ic">
                <ToolIcon name={t.iconName} size={15} stroke={1.7} />
              </span>
              <span className="bga-reltools-opt-label">{t.title}</span>
              {on && <IconCheck size={13} stroke={2.6} className="bga-reltools-opt-check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
