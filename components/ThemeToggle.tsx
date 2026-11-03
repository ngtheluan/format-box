"use client";
import { useI18n } from "@/lib/i18n";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const saved = (localStorage.getItem("fb-theme") as "dark" | "light" | null) ?? "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("fb-theme", next);
  };

  return (
    <button className="theme-btn" onClick={toggle} title={t("theme_toggle_title")} aria-label={t("theme_toggle_aria")}>
      {theme === "dark" ? <IconSun size={18} stroke={1.8} /> : <IconMoon size={18} stroke={1.8} />}
    </button>
  );
}
