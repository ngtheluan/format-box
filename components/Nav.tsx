import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import ToolsMenu from "./ToolsMenu";

export default function Nav() {
  return (
    <nav className="nav">
      <Logo />
      <div className="nav-r">
        <ToolsMenu />
        <ThemeToggle />
      </div>
    </nav>
  );
}
