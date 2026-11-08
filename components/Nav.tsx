"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import BlogNavLink from "./BlogNavLink";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import SearchPalette from "./SearchPalette";
import ThemeToggle from "./ThemeToggle";
import ToolsMenu from "./ToolsMenu";

type InitialUser = { id: string; accountname: string; firstname: string; lastname: string; role: "user" | "admin" | "superadmin" } | null;

export default function Nav({ initialUser = null }: { initialUser?: InitialUser }) {
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();
  const isBlog = pathname === "/blog" || pathname.startsWith("/blog/");

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const THRESHOLD = 6;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - last;
        if (y < 80) setHidden(false);
        else if (dy > THRESHOLD) setHidden(true);
        else if (dy < -THRESHOLD) setHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`nav${hidden ? " nav-hidden" : ""}`}>
      <div className="nav-l">
        <MobileMenu />
        <Logo variant={isBlog ? "blog" : "user"} />
        <ToolsMenu />
        <SearchPalette />
      </div>
      <div className="nav-r">
        <ThemeToggle />
        <BlogNavLink />
        <AccountMenu initialUser={initialUser} />
      </div>
    </nav>
  );
}
