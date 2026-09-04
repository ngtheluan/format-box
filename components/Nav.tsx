import LangToggle from "./LangToggle";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import SearchPalette from "./SearchPalette";
import ThemeToggle from "./ThemeToggle";
import ToolsMenu from "./ToolsMenu";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-l">
        <MobileMenu />
        <Logo />
        <ToolsMenu />
      </div>
      <div className="nav-r">
        <SearchPalette />
        <LangToggle />
        <ThemeToggle />
      </div>
    </nav>
  );
}
