"use client";
import { createContext, useContext, useId, useState, type ReactNode } from "react";

type Ctx = { value: string; setValue: (v: string) => void; baseId: string };
const TabsCtx = createContext<Ctx | null>(null);

export type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  variant?: "line" | "pill" | "segment";
  children: ReactNode;
  className?: string;
};

export function Tabs({ defaultValue, value, onValueChange, variant = "line", children, className }: TabsProps) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const active = value ?? inner;
  const baseId = useId();
  const setValue = (v: string) => {
    if (value == null) setInner(v);
    onValueChange?.(v);
  };
  return (
    <TabsCtx.Provider value={{ value: active, setValue, baseId }}>
      <div className={["ui-tabs", `ui-tabs--${variant}`, className].filter(Boolean).join(" ")}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="tablist" className={["ui-tabs-list", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function Tab({ value, children, disabled }: { value: string; children: ReactNode; disabled?: boolean }) {
  const ctx = useContext(TabsCtx);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      id={`${ctx.baseId}-tab-${value}`}
      disabled={disabled}
      className={`ui-tab${active ? " ui-tab--active" : ""}`}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsCtx);
  if (!ctx || ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      className={["ui-tabpanel", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}

export default Tabs;
