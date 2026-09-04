import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

type NavLink = { href: string; label: string; cta?: boolean };

export default function Nav({ links }: { links?: NavLink[] }) {
  const defaultLinks: NavLink[] = [
    { href: "/base64", label: "Base64" },
    { href: "/json", label: "JSON" },
    { href: "/image", label: "Image" },
  ];
  const items = links ?? defaultLinks;
  return (
    <nav className="nav">
      <Logo />
      <div className="nav-r">
        {items.map((l) => (
          <Link key={l.href} href={l.href} className={l.cta ? "nav-cta" : undefined}>
            {l.label}
          </Link>
        ))}
        <ThemeToggle />
      </div>
    </nav>
  );
}
