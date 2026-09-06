"use client";
import type { HTMLAttributes } from "react";

export type KbdProps = HTMLAttributes<HTMLElement> & { size?: "sm" | "md" };

export default function Kbd({ size = "md", className, ...rest }: KbdProps) {
  return <kbd className={["ui-kbd", `ui-kbd--${size}`, className].filter(Boolean).join(" ")} {...rest} />;
}
