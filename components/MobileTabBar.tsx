"use client";
import { useI18n } from "@/lib/i18n";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import {
  IconHome,
  IconLock,
  IconLogout,
  IconMail,
  IconMenu4,
  IconMessageDots,
  IconNews,
  IconSettings,
  IconUser,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LangToggle from "./LangToggle";
import RoleBadge from "./RoleBadge";
import SkinPicker from "./SkinPicker";
import ThemeToggle from "./ThemeToggle";
import { useToast } from "./Toast";

type AccountView = "user-auth" | null;
type AuthMode = "login" | "register";
type AppRole = "user" | "admin" | "superadmin";
type AppUser = { id: string; accountname: string; firstname: string; lastname: string; role?: AppRole };
type AppMode = "user" | "admin";
const MODE_KEY = "fb-mode";

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountView, setAccountView] = useState<AccountView>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [accountname, setAccountname] = useState("");
  const [password, setPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<AppMode>("user");
  const [kbInset, setKbInset] = useState(0);
  const [hidden, setHidden] = useState(false);
  const toast = useToast();
  const { t } = useI18n();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY) as AppMode | null;
      if (saved === "admin" || saved === "user") setMode(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const next: AppMode = pathname.startsWith("/admin") ? "admin" : "user";
    setMode((prev) => {
      if (prev === next) return prev;
      try {
        localStorage.setItem(MODE_KEY, next);
      } catch {}
      window.dispatchEvent(new CustomEvent("fb:mode-change", { detail: { mode: next } }));
      return next;
    });
  }, [pathname]);

  function switchMode(next: AppMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {}
    window.dispatchEvent(new CustomEvent("fb:mode-change", { detail: { mode: next } }));
    setSettingsOpen(false);
    if (next === "admin") {
      router.push("/admin");
    } else if (pathname.startsWith("/admin")) {
      router.push("/");
    }
  }
  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => setUser(d?.user ?? null))
      .catch(() => {});
  }, []);
  useEffect(() => {
    setSettingsOpen(false);
    closeAccount();
  }, [pathname]);
  useEffect(() => {
    if (!accountView) {
      setKbInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbInset(inset);
    };
    update();
    const t1 = window.setTimeout(update, 150);
    const t2 = window.setTimeout(update, 400);
    const t3 = window.setTimeout(update, 800);
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [accountView]);

  useEffect(() => {
    if (settingsOpen || accountView || menuOpen) {
      setHidden(false);
      return;
    }
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (y < 10) setHidden(false);
        else if (dy > 6) setHidden(true);
        else if (dy < -6) setHidden(false);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [settingsOpen, accountView, menuOpen]);

  useEffect(() => {
    const onSearchState = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      setMenuOpen(!!detail?.open);
    };
    window.addEventListener("fb:search-state", onSearchState);
    return () => window.removeEventListener("fb:search-state", onSearchState);
  }, []);

  function closeAccount() {
    setAccountView(null);
    setAuthMode("login");
    setAccountname("");
    setPassword("");
    setFirstname("");
    setLastname("");
    setEmail("");
    setAuthErr("");
    setBusy(false);
  }

  function afterAuth() {
    if (pathname === "/forbidden") {
      const from = new URLSearchParams(window.location.search).get("from");
      router.replace(from || "/");
    }
    router.refresh();
  }

  async function doLogin() {
    if (busy || !accountname || !password) return;
    setAuthErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountname, password }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        setUser(d.user);
        window.dispatchEvent(new CustomEvent("fb:user-changed", { detail: { user: d.user } }));
        closeAccount();
        toast(`${t("acct_hello")} ${d.user.firstname || d.user.accountname}!`);
        afterAuth();
      } else if (d.notFound) {
        setAuthMode("register");
        setAuthErr(t("acct_err_notfound"));
      } else {
        setAuthErr(d.error || t("acct_err_login_failed"));
      }
    } catch {
      setAuthErr(t("acct_err_network"));
    } finally {
      setBusy(false);
    }
  }

  async function doRegister() {
    if (busy || !firstname || !lastname || !accountname || !email || password.length < MIN_PASSWORD_LENGTH) return;
    setAuthErr("");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthErr(t("acct_err_email_invalid"));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstname, lastname, accountname, email, password }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        setUser(d.user);
        window.dispatchEvent(new CustomEvent("fb:user-changed", { detail: { user: d.user } }));
        closeAccount();
        toast(`${t("acct_created_hello")} ${d.user.firstname || d.user.accountname}!`);
        afterAuth();
      } else {
        setAuthErr(d.error || t("acct_err_register_failed"));
      }
    } catch {
      setAuthErr(t("acct_err_network"));
    } finally {
      setBusy(false);
    }
  }

  async function doLogout() {
    try {
      await fetch("/api/user/logout", { method: "POST" });
    } catch {}
    if (pathname.startsWith("/admin")) router.replace("/");
    router.refresh();
    setUser(null);
    window.dispatchEvent(new CustomEvent("fb:user-changed", { detail: { user: null } }));
    closeAccount();
    toast(t("acct_logged_out"));
  }

  const dispatch = (name: string) => window.dispatchEvent(new CustomEvent(name));

  const isHome = pathname === "/";
  const isBlog = pathname === "/blog";
  const isBlogPost = pathname.startsWith("/blog/");

  return (
    <>
      <nav
        className="mtab"
        aria-label="Mobile"
        style={{
          transition: "transform 220ms ease, opacity 220ms ease",
          transform: hidden ? "translateY(calc(100% + 32px))" : "translateY(0)",
          opacity: hidden ? 0 : 1,
          pointerEvents: hidden ? "none" : undefined,
        }}
      >
        <button
          type="button"
          className={`mtab-btn${menuOpen || isBlogPost ? " active" : ""}`}
          onClick={() => dispatch("fb:open-search")}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <IconMenu4 size={22} stroke={1.8} />
          <span>{t("mtab_menu")}</span>
        </button>

        <Link href="/blog" className={`mtab-btn${isBlog ? " active" : ""}`} aria-label={t("mtab_blog")}>
          <IconNews size={22} stroke={1.8} />
          <span>{t("mtab_blog")}</span>
        </Link>

        <Link href="/" className={`mtab-btn${isHome ? " active" : ""}`} aria-label={t("mtab_home")}>
          <IconHome size={22} stroke={1.8} />
          <span>{t("mtab_home")}</span>
        </Link>

        <button
          type="button"
          className={`mtab-btn${accountView ? " active" : ""}`}
          onClick={() => setAccountView("user-auth")}
          aria-label={t("mtab_account")}
          aria-expanded={!!accountView}
        >
          <IconUser size={22} stroke={1.8} />
          <span>{t("mtab_account")}</span>
        </button>

        <button
          type="button"
          className={`mtab-btn${settingsOpen ? " active" : ""}`}
          onClick={() => setSettingsOpen(true)}
          aria-label={t("mtab_setting")}
          aria-expanded={settingsOpen}
        >
          <IconSettings size={22} stroke={1.8} />
          <span>{t("mtab_setting")}</span>
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
                <b>{t("settings_setting")}</b>
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
                <span>{t("settings_theme")}</span>
                <ThemeToggle />
              </div>
              <div className="mtab-sheet-row">
                <span>{t("settings_skin")}</span>
                <SkinPicker />
              </div>
              <div className="mtab-sheet-row">
                <span>{t("settings_language")}</span>
                <LangToggle />
              </div>
              {(user?.role === "admin" || user?.role === "superadmin") && (
                <div className="mtab-sheet-row">
                  <span>{t("settings_mode")}</span>
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

      {accountView &&
        mounted &&
        createPortal(
          <div
            className="mtab-sheet-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeAccount();
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="mtab-sheet"
              style={
                kbInset > 0 ? { marginBottom: kbInset, maxHeight: `calc(100vh - ${kbInset}px - 24px)` } : undefined
              }
            >
              <div className="mtab-sheet-head">
                <span style={{ width: 28 }} />
                <b>
                  {user ? t("acct_account") : authMode === "login" ? t("acct_title_login") : t("acct_title_register")}
                </b>
                <button type="button" className="mtab-sheet-close" onClick={closeAccount} aria-label="Close">
                  <IconX size={18} stroke={2} />
                </button>
              </div>

              {user && (
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
                  <button
                    type="button"
                    className="mtab-sheet-row mtab-sheet-row-btn"
                    onClick={() => {
                      closeAccount();
                      dispatch("fb:open-feedback");
                    }}
                  >
                    <span className="mtab-sheet-row-ico">
                      <IconMessageDots size={20} stroke={1.8} />
                    </span>
                    <span className="mtab-acct-body">
                      <b>{t("mtab_feedback")}</b>
                    </span>
                  </button>
                  <button type="button" className="mtab-sheet-row mtab-sheet-row-btn" onClick={doLogout}>
                    <span className="mtab-sheet-row-ico">
                      <IconLogout size={20} stroke={1.8} />
                    </span>
                    <span className="mtab-acct-body">
                      <b>{t("acct_logout")}</b>
                    </span>
                  </button>
                </div>
              )}

              {!user && authMode === "login" && (
                <form
                  className="mtab-acct-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    doLogin();
                  }}
                >
                  <label className="mtab-acct-input">
                    <IconUser size={16} stroke={1.8} />
                    <input
                      className="fx-input"
                      type="text"
                      value={accountname}
                      onChange={(e) => setAccountname(e.target.value)}
                      placeholder={t("acct_placeholder_username")}
                      autoFocus
                    />
                  </label>
                  <label className="mtab-acct-input">
                    <IconLock size={16} stroke={1.8} />
                    <input
                      className="fx-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("acct_placeholder_password")}
                    />
                  </label>
                  {authErr && <small className="mtab-acct-err">{authErr}</small>}
                  <button type="submit" className="fx-btn fx-btn-primary" disabled={!accountname || !password || busy}>
                    {busy ? t("acct_busy") : t("acct_btn_login")}
                  </button>
                  <button
                    type="button"
                    className="fx-btn"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthErr("");
                    }}
                  >
                    {t("acct_switch_to_register")}
                  </button>
                </form>
              )}

              {!user && authMode === "register" && (
                <form
                  className="mtab-acct-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    doRegister();
                  }}
                >
                  <label className="mtab-acct-input">
                    <IconUser size={16} stroke={1.8} />
                    <input
                      className="fx-input"
                      type="text"
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                      placeholder={t("acct_placeholder_firstname")}
                      autoFocus
                    />
                  </label>
                  <label className="mtab-acct-input">
                    <IconUser size={16} stroke={1.8} />
                    <input
                      className="fx-input"
                      type="text"
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                      placeholder={t("acct_placeholder_lastname")}
                    />
                  </label>
                  <label className="mtab-acct-input">
                    <IconMail size={16} stroke={1.8} />
                    <input
                      className="fx-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("acct_placeholder_email")}
                      autoComplete="email"
                    />
                  </label>
                  <label className="mtab-acct-input">
                    <IconUserCircle size={16} stroke={1.8} />
                    <input
                      className="fx-input"
                      type="text"
                      value={accountname}
                      onChange={(e) => setAccountname(e.target.value)}
                      placeholder={t("acct_placeholder_username")}
                    />
                  </label>
                  <label className="mtab-acct-input">
                    <IconLock size={16} stroke={1.8} />
                    <input
                      className="fx-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("acct_placeholder_password_min")}
                    />
                  </label>
                  {authErr && <small className="mtab-acct-err">{authErr}</small>}
                  <button
                    type="submit"
                    className="fx-btn fx-btn-primary"
                    disabled={
                      !firstname || !lastname || !accountname || !email || password.length < MIN_PASSWORD_LENGTH || busy
                    }
                  >
                    {busy ? t("acct_busy") : t("acct_btn_register")}
                  </button>
                  <button
                    type="button"
                    className="fx-btn"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthErr("");
                    }}
                  >
                    {t("acct_switch_to_login")}
                  </button>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
