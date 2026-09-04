"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("fb-theme") as "dark" | "light" | null) ?? "dark";
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
    <button
      className="theme-btn"
      onClick={toggle}
      title="Đổi giao diện sáng/tối"
      aria-label="Đổi giao diện"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
