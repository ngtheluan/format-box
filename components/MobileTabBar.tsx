"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconHome,
  IconSearch,
  IconMenu2,
  IconSettings,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import ThemeToggle from "./ThemeToggle";
import SkinPicker from "./SkinPicker";
import LangToggle from "./LangToggle";

export default function MobileTabBar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setSettingsOpen(false), [pathname]);

  const dispatch = (name: string) =>
    window.dispatchEvent(new CustomEvent(name));

  return (
    <>
      <nav className="mtab" aria-label="Mobile">
        <Link
          href="/"
          className={`mtab-btn${pathname === "/" ? " active" : ""}`}
          aria-label="Home"
        >
          <IconHome size={22} stroke={1.8} />
          <span>Home</span>
        </Link>
        <button
          type="button"
          className="mtab-btn"
          onClick={() => dispatch("fb:open-search")}
          aria-label="Search"
        >
          <IconSearch size={22} stroke={1.8} />
          <span>Search</span>
        </button>
        <button
          type="button"
          className="mtab-btn"
          onClick={() => dispatch("fb:open-menu")}
          aria-label="Menu"
        >
          <IconMenu2 size={22} stroke={1.8} />
          <span>Menu</span>
        </button>
        <button
          type="button"
          className="mtab-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Setting"
        >
          <IconSettings size={22} stroke={1.8} />
          <span>Setting</span>
        </button>
        <Link
          href="/admin"
          className={`mtab-btn${pathname.startsWith("/admin") ? " active" : ""}`}
          aria-label="Account"
        >
          <IconUser size={22} stroke={1.8} />
          <span>Account</span>
        </Link>
      </nav>

      {settingsOpen &&
        mounted &&
        createPortal(
          <div
            className="mtab-sheet-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSettingsOpen(false);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="mtab-sheet">
              <div className="mtab-sheet-head">
                <b>Setting</b>
                <button
                  type="button"
                  className="mtab-sheet-close"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Close"
                >
                  <IconX size={18} stroke={2} />
                </button>
              </div>
              <div className="mtab-sheet-row">
                <span>Theme</span>
                <ThemeToggle />
              </div>
              <div className="mtab-sheet-row">
                <span>Skin</span>
                <SkinPicker />
              </div>
              <div className="mtab-sheet-row">
                <span>Language</span>
                <LangToggle />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
