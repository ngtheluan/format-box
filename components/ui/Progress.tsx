"use client";
import type { HTMLAttributes } from "react";

export type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value: number; // 0-100
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  tone?: "primary" | "success" | "warning" | "danger";
  striped?: boolean;
  animated?: boolean;
  showLabel?: boolean;
  indeterminate?: boolean;
};

export default function Progress({
  value,
  max = 100,
  size = "md",
  tone = "primary",
  striped,
  animated,
  showLabel,
  indeterminate,
  className,
  ...rest
}: ProgressProps) {
  const pct = indeterminate ? 100 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={[
        "ui-progress",
        `ui-progress--${size}`,
        `ui-progress--${tone}`,
        striped && "ui-progress--striped",
        animated && "ui-progress--animated",
        indeterminate && "ui-progress--indet",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemax={max}
      aria-valuemin={0}
      {...rest}
    >
      <div className="ui-progress-track">
        <div className="ui-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {showLabel && !indeterminate && <span className="ui-progress-label">{Math.round(pct)}%</span>}
    </div>
  );
}
