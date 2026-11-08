import Link from "next/link";

type LogoVariant = "user" | "admin" | "blog";

const TILE: Record<LogoVariant, [string, string]> = {
  user: ["#3b82f6", "#1d4ed8"],
  admin: ["#f59e0b", "#b45309"],
  blog: ["#2dd4bf", "#0f766e"],
};

const BOX: Record<Exclude<LogoVariant, "blog">, string> = {
  user: "#7dd3fc",
  admin: "#fef3c7",
};

export function LogoMark({ size = 30, variant = "user" }: { size?: number; variant?: LogoVariant }) {
  const id = `logo-tile-${variant}`;
  const [from, to] = TILE[variant];

  return (
    <svg className="logo-mark" viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      {variant === "blog" ? (
        <path
          fill="#fff"
          fillRule="evenodd"
          d="M12 5.5h8V8h-8V5.5ZM12.4 9.5h7.2l3.4 6.3L16 27.5 9 15.8l3.4-6.3ZM15.4 22.8V17.9a2.1 2.1 0 1 1 1.2 0v4.9h-1.2Z"
        />
      ) : (
        <>
          <path fill="#fff" d="M9 9.5A1.5 1.5 0 0 1 10.5 8H23v4.5h-9.5v3H20V20h-6.5v4H9V9.5Z" />
          <rect x="18.5" y="19" width="5" height="5" rx="1.2" fill={BOX[variant]} />
        </>
      )}
    </svg>
  );
}

export default function Logo({ href = "/", variant = "user" }: { href?: string; variant?: LogoVariant }) {
  return (
    <Link href={href} className="logo" aria-label="FormatBox home">
      <LogoMark variant={variant} />
      <b>
        Format<span>Box</span>
      </b>
      {variant === "blog" && <i className="logo-tag">Blog</i>}
    </Link>
  );
}
