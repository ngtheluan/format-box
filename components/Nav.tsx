import Link from "next/link";
import LangToggle from "./LangToggle";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import SearchPalette from "./SearchPalette";
import SkinPicker from "./SkinPicker";
import ThemeToggle from "./ThemeToggle";
import ToolsMenu from "./ToolsMenu";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-l">
        <MobileMenu />
        <Logo />
        <ToolsMenu />
        <Link
          href="/blog"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text)",
            padding: "6px 12px",
            borderRadius: 8,
            transition: "all .15s",
          }}
          className="nav-blog-link"
        >
          Blog
        </Link>
      </div>
      <div className="nav-r">
        <SearchPalette />
        <LangToggle />
        <SkinPicker />
        <ThemeToggle />
      </div>
    </nav>
  );
}
