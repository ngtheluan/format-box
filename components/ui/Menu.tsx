"use client";
import { cloneElement, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";

export type MenuItem = {
  label: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
};

export type MenuProps = {
  trigger: ReactElement;
  items: MenuItem[];
  align?: "start" | "end";
};

export default function Menu({ trigger, items, align = "start" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const withHandler = isValidElement(trigger)
    ? cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          (trigger.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e);
          setOpen((v) => !v);
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
      } as Record<string, unknown>)
    : trigger;

  return (
    <span ref={wrapRef} className="ui-menu-wrap">
      {withHandler}
      {open && (
        <div role="menu" className={`ui-menu ui-menu--${align}`}>
          {items.map((it, i) =>
            it.separator ? (
              <div key={`sep-${i}`} className="ui-menu-sep" role="separator" />
            ) : (
              <button
                key={i}
                role="menuitem"
                type="button"
                className={`ui-menu-item${it.danger ? " ui-menu-item--danger" : ""}`}
                disabled={it.disabled}
                onClick={() => {
                  it.onClick?.();
                  setOpen(false);
                }}
              >
                {it.icon && <span className="ui-menu-ic">{it.icon}</span>}
                <span>{it.label}</span>
              </button>
            ),
          )}
        </div>
      )}
    </span>
  );
}
