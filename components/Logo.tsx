import Link from "next/link";

export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="FormatBox home">
      <svg viewBox="0 0 26 26">
        <rect x="2" y="2" width="22" height="22" />
        <line x1="2" y1="13" x2="24" y2="13" />
        <line x1="13" y1="2" x2="13" y2="24" />
      </svg>
      <b>
        Format<span>Box</span>
      </b>
    </Link>
  );
}
