"use client";
import type { HTMLAttributes } from "react";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  lines?: number;
};

export default function Skeleton({
  width,
  height,
  radius,
  circle,
  lines,
  className,
  style,
  ...rest
}: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={["ui-skeleton-lines", className].filter(Boolean).join(" ")} {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className="ui-skeleton"
            style={{
              width: i === lines - 1 ? "60%" : "100%",
              height: height ?? 12,
              borderRadius: radius ?? 6,
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <span
      className={["ui-skeleton", className].filter(Boolean).join(" ")}
      style={{
        width: width ?? "100%",
        height: height ?? 16,
        borderRadius: circle ? "50%" : (radius ?? 6),
        ...style,
      }}
      {...rest}
    />
  );
}
