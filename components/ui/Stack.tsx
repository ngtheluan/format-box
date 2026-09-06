"use client";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

type StackProps = HTMLAttributes<HTMLDivElement> & {
  gap?: number | string;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean;
  inline?: boolean;
  children?: ReactNode;
};

function styleFor(gap?: number | string, align?: string, justify?: string, wrap?: boolean, inline?: boolean) {
  const s: CSSProperties = {};
  if (gap !== undefined) s.gap = typeof gap === "number" ? `${gap}px` : gap;
  if (align) s.alignItems = align;
  if (justify) s.justifyContent = justify;
  if (wrap) s.flexWrap = "wrap";
  if (inline) s.display = "inline-flex";
  return s;
}

export function VStack({ gap = 12, align, justify, wrap, inline, style, className, ...rest }: StackProps) {
  return (
    <div
      className={["ui-stack ui-stack--v", className].filter(Boolean).join(" ")}
      style={{ ...styleFor(gap, align, justify, wrap, inline), ...style }}
      {...rest}
    />
  );
}

export function HStack({ gap = 12, align = "center", justify, wrap, inline, style, className, ...rest }: StackProps) {
  return (
    <div
      className={["ui-stack ui-stack--h", className].filter(Boolean).join(" ")}
      style={{ ...styleFor(gap, align, justify, wrap, inline), ...style }}
      {...rest}
    />
  );
}

export function Stack({ gap = 12, align, justify, wrap, inline, style, className, ...rest }: StackProps) {
  return (
    <div
      className={["ui-stack ui-stack--v", className].filter(Boolean).join(" ")}
      style={{ ...styleFor(gap, align, justify, wrap, inline), ...style }}
      {...rest}
    />
  );
}

export default Stack;
