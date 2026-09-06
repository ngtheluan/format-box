"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  hideClose?: boolean;
  children?: ReactNode;
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  closeOnOverlay = true,
  closeOnEsc = true,
  hideClose,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, closeOnEsc]);

  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div className="ui-modal-overlay" onClick={closeOnOverlay ? onClose : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        className={`ui-modal ui-modal--${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || !hideClose) && (
          <div className="ui-modal-head">
            <div className="ui-modal-titles">
              {title && <div className="ui-modal-title">{title}</div>}
              {description && <div className="ui-modal-desc">{description}</div>}
            </div>
            {!hideClose && (
              <button className="ui-modal-x" aria-label="Close" onClick={onClose}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children && <div className="ui-modal-body">{children}</div>}
        {footer && <div className="ui-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
