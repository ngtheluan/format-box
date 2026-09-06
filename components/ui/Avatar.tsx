"use client";
import { useState, type ImgHTMLAttributes } from "react";

export type AvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "size"> & {
  src?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  shape?: "circle" | "square";
  status?: "online" | "offline" | "busy" | "away";
};

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase() || "?";
}

function colorFor(name?: string) {
  if (!name) return "#6366f1";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 60% 55%)`;
}

const SIZES: Record<string, number> = { xs: 20, sm: 28, md: 36, lg: 48, xl: 64 };

export default function Avatar({ src, name, size = "md", shape = "circle", status, alt, className, ...rest }: AvatarProps) {
  const [err, setErr] = useState(false);
  const px = typeof size === "number" ? size : SIZES[size];
  const showImg = src && !err;
  return (
    <span
      className={[
        "ui-avatar",
        `ui-avatar--${shape}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width: px, height: px, fontSize: Math.round(px * 0.4), background: showImg ? undefined : colorFor(name) }}
    >
      {showImg ? (
        <img src={src} alt={alt ?? name ?? ""} onError={() => setErr(true)} {...rest} />
      ) : (
        <span className="ui-avatar-txt">{initials(name)}</span>
      )}
      {status && <span className={`ui-avatar-status ui-avatar-status--${status}`} aria-label={status} />}
    </span>
  );
}
