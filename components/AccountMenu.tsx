"use client";
import { useI18n } from "@/lib/i18n";
import { IconLoader2, IconLock, IconLogout, IconUser, IconUserCircle } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LangToggle from "./LangToggle";
import SkinPicker from "./SkinPicker";
import ThemeToggle from "./ThemeToggle";
import { useToast } from "./Toast";

type View = "menu" | "auth";
type AuthMode = "login" | "register";
type AppRole = "user" | "admin";
type AppUser = { id: string; accountname: string; firstname: string; lastname: string; role?: AppRole };
type AppMode = "user" | "admin";
const MODE_KEY = "fb-mode";

export default function AccountMenu() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [mode, setMode] = useState<AppMode>("user");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [accountname, setAccountname] = useState("");
  const [password, setPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => setUser(d?.user ?? null))
      .catch(() => {});
    try {
      const saved = localStorage.getItem(MODE_KEY) as AppMode | null;
      if (saved === "admin" || saved === "user") setMode(saved);
    } catch {}
  }, []);

  function switchMode(next: AppMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {}
    window.dispatchEvent(new CustomEvent("fb:mode-change", { detail: { mode: next } }));
    close();
    if (next === "admin") router.push("/admin");
    else if (pathname.startsWith("/admin")) router.push("/");
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function reset() {
    setView("menu");
    setAuthMode("login");
    setAccountname("");
    setPassword("");
    setFirstname("");
    setLastname("");
    setAuthErr("");
    setBusy(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function doLogin() {
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
        close();
        toast(`${t("acct_hello")} ${d.user.firstname || d.user.accountname}!`);
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
    setAuthErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstname, lastname, accountname, password }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        setUser(d.user);
        close();
        toast(`${t("acct_created_hello")} ${d.user.firstname || d.user.accountname}!`);
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
    setUser(null);
    close();
    toast(t("acct_logged_out"));
  }

  //   const title = view === "menu" ? "Menu" : user ? "Account" : authMode === "login" ? "Đăng nhập" : "Đăng ký";

  return (
    <div className="account-menu" ref={ref}>
      <button
        type="button"
        className="theme-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        aria-expanded={open}
        title={user ? `@${user.accountname}` : t("acct_label")}
      >
        <IconUserCircle size={18} stroke={1.8} />
      </button>

      {open && (
        <div className="account-pop" role="dialog" aria-label="Account">
          {view === "menu" && (
            <>
              <div className="account-pop-list">
                {user ? (
                  <div className="account-pop-row account-pop-user">
                    <span className="account-pop-ico">
                      <IconUser size={18} stroke={2} />
                    </span>
                    <span className="account-pop-body">
                      <b>
                        {user.firstname} {user.lastname}
                      </b>
                      <small>@{user.accountname}</small>
                    </span>
                    <button
                      type="button"
                      className="account-pop-logout"
                      onClick={doLogout}
                      aria-label={t("acct_logout")}
                      title={t("acct_logout")}
                    >
                      <IconLogout size={18} stroke={1.8} />
                    </button>
                  </div>
                ) : (
                  <button type="button" className="account-pop-row account-pop-btn" onClick={() => setView("auth")}>
                    <span className="account-pop-ico">
                      <IconUserCircle size={20} stroke={1.8} />
                    </span>
                    <span className="account-pop-body">
                      <b>{t("acct_account")}</b>
                      <small>{t("acct_login_subtitle")}</small>
                    </span>
                  </button>
                )}
              </div>

              <div className="account-pop-sep" />

              <div className="account-pop-settings">
                <div className="account-pop-setting">
                  <span>{t("settings_theme")}</span>
                  <ThemeToggle />
                </div>
                <div className="account-pop-setting">
                  <span>{t("settings_skin")}</span>
                  <SkinPicker />
                </div>
                <div className="account-pop-setting">
                  <span>{t("settings_language")}</span>
                  <LangToggle />
                </div>
                {user?.role === "admin" && (
                  <div className="account-pop-setting">
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
            </>
          )}

          {view === "auth" && authMode === "login" && (
            <form
              className={`account-pop-form${busy ? " is-busy" : ""}`}
              aria-busy={busy}
              onSubmit={(e) => {
                e.preventDefault();
                doLogin();
              }}
            >
              {busy && <div className="account-pop-progress" aria-hidden="true" />}
              <label className="account-pop-input">
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
              <label className="account-pop-input">
                <IconLock size={16} stroke={1.8} />
                <input
                  className="fx-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("acct_placeholder_password")}
                />
              </label>
              {authErr && <small className="account-pop-err">{authErr}</small>}
              <button type="submit" className="fx-btn fx-btn-primary" disabled={!accountname || !password || busy}>
                {busy ? (
                  <>
                    <IconLoader2 size={14} stroke={2.4} className="spin" />
                    <span>{t("acct_btn_login_busy")}</span>
                  </>
                ) : (
                  t("acct_btn_login")
                )}
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

          {view === "auth" && authMode === "register" && (
            <form
              className={`account-pop-form${busy ? " is-busy" : ""}`}
              aria-busy={busy}
              onSubmit={(e) => {
                e.preventDefault();
                doRegister();
              }}
            >
              {busy && <div className="account-pop-progress" aria-hidden="true" />}
              <label className="account-pop-input">
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
              <label className="account-pop-input">
                <IconUser size={16} stroke={1.8} />
                <input
                  className="fx-input"
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder={t("acct_placeholder_lastname")}
                />
              </label>
              <label className="account-pop-input">
                <IconUserCircle size={16} stroke={1.8} />
                <input
                  className="fx-input"
                  type="text"
                  value={accountname}
                  onChange={(e) => setAccountname(e.target.value)}
                  placeholder={t("acct_placeholder_username")}
                />
              </label>
              <label className="account-pop-input">
                <IconLock size={16} stroke={1.8} />
                <input
                  className="fx-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("acct_placeholder_password_min")}
                />
              </label>
              {authErr && <small className="account-pop-err">{authErr}</small>}
              <button
                type="submit"
                className="fx-btn fx-btn-primary"
                disabled={!firstname || !lastname || !accountname || password.length < 6 || busy}
              >
                {busy ? (
                  <>
                    <IconLoader2 size={14} stroke={2.4} className="spin" />
                    <span>{t("acct_btn_register_busy")}</span>
                  </>
                ) : (
                  t("acct_btn_register")
                )}
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
      )}
    </div>
  );
}
