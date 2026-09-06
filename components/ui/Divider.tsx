"use client";
import type { HTMLAttributes, ReactNode } from "react";

export type DividerProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
  label?: ReactNode;
  dashed?: boolean;
};

export default function Divider({ orientation = "horizontal", label, dashed, className, ...rest }: DividerProps) {
  return (
    <div
      role="separator"
      className={[
        "ui-divider",
        `ui-divider--${orientation}`,
        dashed && "ui-divider--dashed",
        label && "ui-divider--label",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {label && orientation === "horizontal" && <span className="ui-divider-label">{label}</span>}
    </div>
  );
}
