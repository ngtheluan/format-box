import Link from "next/link";

export function LogoMark({
  size = 30,
  variant = "user",
}: {
  size?: number;
  variant?: "user" | "admin";
}) {
  const isAdmin = variant === "admin";
  const id = isAdmin ? "a" : "u";
  const top = isAdmin ? ["#fde68a", "#fbbf24"] : ["#c4b5fd", "#8b8cff"];
  const left = isAdmin ? ["#f59e0b", "#b45309"] : ["#6366f1", "#4338ca"];
  const right = isAdmin ? ["#ef4444", "#991b1b"] : ["#7c3aed", "#5b21b6"];

  return (
    <svg
      className="logo-mark"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`t${id}`} x1="16" y1="3" x2="16" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={top[0]} />
          <stop offset="100%" stopColor={top[1]} />
        </linearGradient>
        <linearGradient id={`l${id}`} x1="4" y1="11" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={left[0]} />
          <stop offset="100%" stopColor={left[1]} />
        </linearGradient>
        <linearGradient id={`r${id}`} x1="28" y1="11" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={right[0]} />
          <stop offset="100%" stopColor={right[1]} />
        </linearGradient>
        <linearGradient id={`g${id}`} x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity=".18" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M16 3 4 10v12l12 7 12-7V10L16 3Z" fill="#0b0b12" opacity=".22" />
      <path d="M16 3 4 10l12 7 12-7L16 3Z" fill={`url(#t${id})`} />
      <path d="M4 10v12l12 7V17L4 10Z" fill={`url(#l${id})`} />
      <path d="M28 10v12l-12 7V17l12-7Z" fill={`url(#r${id})`} />
      <path d="M16 3 4 10l12 7 12-7L16 3Z" fill={`url(#g${id})`} />
      <path
        d="M16 3 4 10l12 7 12-7L16 3Z"
        fill="none"
        stroke="#fff"
        strokeWidth=".6"
        strokeOpacity=".38"
        strokeLinejoin="round"
      />
      <path
        d="M4 10v12l12 7 12-7V10"
        fill="none"
        stroke="#fff"
        strokeWidth=".6"
        strokeOpacity=".2"
        strokeLinejoin="round"
      />
      {isAdmin && (
        <>
          <path
            d="m13 21 3 1.6 3-1.6"
            fill="none"
            stroke="#fff"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M16 22.6v2.8" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function Logo({
  href = "/",
  variant = "user",
}: {
  href?: string;
  variant?: "user" | "admin";
}) {
  return (
    <Link href={href} className="logo" aria-label="FormatBox home">
      <LogoMark variant={variant} />
      <b>
        Format<span>Box</span>
      </b>
    </Link>
  );
}
