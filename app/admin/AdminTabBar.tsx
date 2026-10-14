"use client";
import LangToggle from "@/components/LangToggle";
import RoleBadge from "@/components/RoleBadge";
import SkinPicker from "@/components/SkinPicker";
import ThemeToggle from "@/components/ThemeToggle";
import { IconHome, IconLogout, IconSettings, IconUser, IconUserCircle, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type AppMode = "user" | "admin";
type AppRole = "user" | "admin";
type AppUser = { id: string; accountname: string; firstname: string; lastname: string; role?: AppRole };
const MODE_KEY = "fb-mode";

export default function AdminTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mode, setMode] = useState<AppMode>("admin");
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY) as AppMode | null;
      if (saved === "admin" || saved === "user") setMode(saved);
    } catch {}
  }, []);
  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => setUser(d?.user ?? null))
      .catch(() => {});
  }, []);
  useEffect(() => {
    setSettingsOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  function switchMode(next: AppMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {}
    window.dispatchEvent(new CustomEvent("fb:mode-change", { detail: { mode: next } }));
    setSettingsOpen(false);
    setAccountOpen(false);
    if (next === "user") router.push("/");
    else if (!pathname.startsWith("/admin")) router.push("/admin");
  }

  async function doLogout() {
    try {
      await fetch("/api/user/logout", { method: "POST" });
    } catch {}
    setUser(null);
    setAccountOpen(false);
    router.replace("/");
    router.refresh();
  }

  const isHome = pathname === "/admin";

  return (
    <>
      <nav className="atab" aria-label="Admin">
        <Link href="/admin" className={`atab-btn${isHome ? " active" : ""}`} aria-label="Trang chủ">
          <IconHome size={22} stroke={1.8} />
          <span>Trang chủ</span>
        </Link>
        <button
          type="button"
          className={`atab-btn${accountOpen ? " active" : ""}`}
          onClick={() => setAccountOpen(true)}
          aria-label="Account"
          aria-expanded={accountOpen}
        >
          <IconUser size={22} stroke={1.8} />
          <span>Account</span>
        </button>
        <button
          type="button"
          className={`atab-btn${settingsOpen ? " active" : ""}`}
          onClick={() => setSettingsOpen(true)}
          aria-label="Setting"
          aria-expanded={settingsOpen}
        >
          <IconSettings size={22} stroke={1.8} />
          <span>Setting</span>
        </button>
      </nav>

      {settingsOpen &&
        mounted &&
        createPortal(
          <div
            className="mtab-sheet-overlay atab-sheet-overlay"
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
              {user?.role === "admin" && (
                <div className="mtab-sheet-row">
                  <span>Mode</span>
                  <div className="lang-toggle" role="group" aria-label="Mode">
                    <button
                      type="button"
                      className={mode === "user" ? "on" : ""}
                      onClick={() => switchMode("user")}
                      aria-pressed={mode === "user"}
                    >
                      USER
                    </button>
                    <button
                      type="button"
                      className={mode === "admin" ? "on" : ""}
                      onClick={() => switchMode("admin")}
                      aria-pressed={mode === "admin"}
                    >
                      ADMIN
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {accountOpen &&
        mounted &&
        createPortal(
          <div
            className="mtab-sheet-overlay atab-sheet-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAccountOpen(false);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="mtab-sheet">
              <div className="mtab-sheet-head">
                <span style={{ width: 28 }} />
                <b>Account</b>
                <button
                  type="button"
                  className="mtab-sheet-close"
                  onClick={() => setAccountOpen(false)}
                  aria-label="Close"
                >
                  <IconX size={18} stroke={2} />
                </button>
              </div>
              {user ? (
                <div className="mtab-acct-list">
                  <div className="mtab-sheet-row">
                    <span className="mtab-sheet-row-ico">
                      <IconUserCircle size={20} stroke={1.8} />
                    </span>
                    <span className="mtab-acct-body">
                      <b style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span>
                          {user.firstname} {user.lastname}
                        </span>
                        <RoleBadge role={user.role ?? "user"} />
                      </b>
                      <small>@{user.accountname}</small>
                    </span>
                  </div>
                  <button type="button" className="mtab-sheet-row mtab-sheet-row-btn" onClick={doLogout}>
                    <span className="mtab-sheet-row-ico">
                      <IconLogout size={20} stroke={1.8} />
                    </span>
                    <span className="mtab-acct-body">
                      <b>Đăng xuất</b>
                    </span>
                  </button>
                </div>
              ) : (
                <div className="mtab-sheet-row">
                  <small>Chưa đăng nhập.</small>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
