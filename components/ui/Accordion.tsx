"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = { openSet: Set<string>; toggle: (v: string) => void; single: boolean };
const AccCtx = createContext<Ctx | null>(null);

export type AccordionProps = {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (v: string[]) => void;
  children: ReactNode;
  className?: string;
};

export function Accordion({ type = "single", defaultValue, value, onValueChange, children, className }: AccordionProps) {
  const single = type === "single";
  const initial = new Set<string>(
    value !== undefined
      ? (Array.isArray(value) ? value : [value]).filter(Boolean)
      : defaultValue !== undefined
        ? (Array.isArray(defaultValue) ? defaultValue : [defaultValue]).filter(Boolean)
        : [],
  );
  const [inner, setInner] = useState<Set<string>>(initial);
  const controlled = value !== undefined;
  const openSet = controlled ? initial : inner;
  const toggle = (v: string) => {
    const next = new Set(openSet);
    if (next.has(v)) next.delete(v);
    else {
      if (single) next.clear();
      next.add(v);
    }
    if (!controlled) setInner(next);
    onValueChange?.([...next]);
  };
  return (
    <AccCtx.Provider value={{ openSet, toggle, single }}>
      <div className={["ui-acc", className].filter(Boolean).join(" ")}>{children}</div>
    </AccCtx.Provider>
  );
}

export function AccordionItem({
  value,
  title,
  children,
  disabled,
}: {
  value: string;
  title: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}) {
  const ctx = useContext(AccCtx);
  if (!ctx) return null;
  const open = ctx.openSet.has(value);
  return (
    <div className={`ui-acc-item${open ? " ui-acc-item--open" : ""}${disabled ? " ui-acc-item--disabled" : ""}`}>
      <button
        type="button"
        className="ui-acc-trigger"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => ctx.toggle(value)}
      >
        <span>{title}</span>
        <span className="ui-acc-caret" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div className="ui-acc-content" hidden={!open}>
        <div className="ui-acc-inner">{children}</div>
      </div>
    </div>
  );
}

export default Accordion;
