"use client";
import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import BlogNavLink from "./BlogNavLink";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import SearchPalette from "./SearchPalette";
import ToolsMenu from "./ToolsMenu";

export default function Nav() {
  const [hidden, setHidden] = useState(false);

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
        <Logo />
        <ToolsMenu />
        <SearchPalette />
      </div>
      <div className="nav-r">
        <BlogNavLink />
        <AccountMenu />
      </div>
    </nav>
  );
}
