"use client";
import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";
export type BadgeVariant = "solid" | "soft" | "outline" | "dot";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  leftIcon?: ReactNode;
  onClose?: () => void;
};

export default function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  leftIcon,
  onClose,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        "ui-badge",
        `ui-badge--${variant}`,
        `ui-badge--${tone}`,
        `ui-badge--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {variant === "dot" && <span className="ui-badge-dot" aria-hidden="true" />}
      {leftIcon && <span className="ui-badge-ic">{leftIcon}</span>}
      {children}
      {onClose && (
        <button className="ui-badge-x" aria-label="Remove" onClick={onClose}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}
