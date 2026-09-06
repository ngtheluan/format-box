"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right" | "top" | "bottom";
  size?: number | string;
  title?: ReactNode;
  footer?: ReactNode;
  closeOnOverlay?: boolean;
  children?: ReactNode;
};

export default function Drawer({
  open,
  onClose,
  side = "right",
  size = 360,
  title,
  footer,
  closeOnOverlay = true,
  children,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof window === "undefined") return null;

  const isVertical = side === "top" || side === "bottom";
  const style = isVertical
    ? { height: typeof size === "number" ? `${size}px` : size }
    : { width: typeof size === "number" ? `${size}px` : size };

  return createPortal(
    <div className="ui-drawer-overlay" onClick={closeOnOverlay ? onClose : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        className={`ui-drawer ui-drawer--${side}`}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="ui-drawer-head">
            <div className="ui-drawer-title">{title}</div>
            <button className="ui-modal-x" aria-label="Close" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="ui-drawer-body">{children}</div>
        {footer && <div className="ui-drawer-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
