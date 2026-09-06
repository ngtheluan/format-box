"use client";
import type { HTMLAttributes } from "react";

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  size?: "xs" | "sm" | "md" | "lg" | number;
  tone?: "current" | "primary" | "dim";
};

const SIZES = { xs: 12, sm: 16, md: 20, lg: 28 } as const;

export default function Spinner({ size = "md", tone = "current", className, style, ...rest }: SpinnerProps) {
  const px = typeof size === "number" ? size : SIZES[size];
  return (
    <span
      role="status"
      aria-label="Loading"
      className={["ui-spinner", `ui-spinner--${tone}`, className].filter(Boolean).join(" ")}
      style={{ width: px, height: px, borderWidth: Math.max(2, Math.round(px / 10)), ...style }}
      {...rest}
    />
  );
}
