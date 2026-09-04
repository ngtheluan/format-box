import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import ToolsMenu from "./ToolsMenu";
import { CommandPaletteTrigger } from "./CommandPalette";

export default function Nav() {
  return (
    <nav className="nav">
      <Logo />
      <div className="nav-r">
        <CommandPaletteTrigger />
        <ToolsMenu />
        <ThemeToggle />
      </div>
    </nav>
  );
}
