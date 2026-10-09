"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconHome,
  IconMenu2,
  IconMessageDots,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import ThemeToggle from "./ThemeToggle";
import SkinPicker from "./SkinPicker";
import LangToggle from "./LangToggle";

type ActionKey = "menu" | "setting" | "account" | null;

export default function MobileTabBar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionKey>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setSettingsOpen(false);
    setActiveAction(null);
  }, [pathname]);

  const dispatch = (name: string) =>
    window.dispatchEvent(new CustomEvent(name));

  const isHome = pathname === "/";

  return (
    <>
      <nav className="mtab" aria-label="Mobile">
        <Link
          href="/"
          className={`mtab-btn${isHome && !activeAction ? " active" : ""}`}
          aria-label="Home"
          onClick={() => setActiveAction(null)}
        >
          <IconHome size={22} stroke={1.8} />
          <span>Home</span>
        </Link>
        <button
          type="button"
          className={`mtab-btn${activeAction === "menu" ? " active" : ""}`}
          onClick={() => {
            setActiveAction("menu");
            dispatch("fb:open-search");
          }}
          aria-label="Menu"
          aria-pressed={activeAction === "menu"}
        >
          <IconMenu2 size={22} stroke={1.8} />
          <span>Menu</span>
        </button>
        <button
          type="button"
          className={`mtab-btn${activeAction === "setting" ? " active" : ""}`}
          onClick={() => {
            setActiveAction("setting");
            setSettingsOpen(true);
          }}
          aria-label="Setting"
          aria-pressed={activeAction === "setting"}
        >
          <IconSettings size={22} stroke={1.8} />
          <span>Setting</span>
        </button>
        <button
          type="button"
          className={`mtab-btn${activeAction === "account" ? " active" : ""}`}
          onClick={() => {
            setActiveAction("account");
            dispatch("fb:open-feedback");
          }}
          aria-label="Account"
          aria-pressed={activeAction === "account"}
        >
          <IconMessageDots size={22} stroke={1.8} />
          <span>Feedback</span>
        </button>
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
