"use client";
import {
  IconArrowLeft,
  IconHome,
  IconLock,
  IconLogout,
  IconMenu4,
  IconMessageDots,
  IconSettings,
  IconShieldLock,
  IconUser,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LangToggle from "./LangToggle";
import SkinPicker from "./SkinPicker";
import ThemeToggle from "./ThemeToggle";
import { useToast } from "./Toast";

type AccountView = "pick" | "user-auth" | null;
type AuthMode = "login" | "register";
type AppUser = { id: string; accountname: string; firstname: string; lastname: string };

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
  const [authErr, setAuthErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toast = useToast();

  useEffect(() => setMounted(true), []);
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
    setAuthErr("");
    setBusy(false);
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
        closeAccount();
        toast(`Xin chào ${d.user.firstname || d.user.accountname}!`);
      } else if (d.notFound) {
        setAuthMode("register");
        setAuthErr("Tài khoản chưa tồn tại — vui lòng đăng ký");
      } else {
        setAuthErr(d.error || "Đăng nhập thất bại");
      }
    } catch {
      setAuthErr("Lỗi kết nối");
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
        closeAccount();
        toast(`Tạo tài khoản thành công, xin chào ${d.user.firstname || d.user.accountname}!`);
      } else {
        setAuthErr(d.error || "Đăng ký thất bại");
      }
    } catch {
      setAuthErr("Lỗi kết nối");
    } finally {
      setBusy(false);
    }
  }

  async function doLogout() {
    try {
      await fetch("/api/user/logout", { method: "POST" });
    } catch {}
    setUser(null);
    closeAccount();
    toast("Đã đăng xuất");
  }

  const dispatch = (name: string) => window.dispatchEvent(new CustomEvent(name));

  const isHome = pathname === "/";

  return (
    <>
      <nav className="mtab" aria-label="Mobile">
        <button
          type="button"
          className={`mtab-btn${menuOpen ? " active" : ""}`}
          onClick={() => dispatch("fb:open-search")}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <IconMenu4 size={22} stroke={1.8} />
          <span>Menu</span>
        </button>

        <button type="button" className="mtab-btn" onClick={() => dispatch("fb:open-feedback")} aria-label="Feedback">
          <IconMessageDots size={22} stroke={1.8} />
          <span>Feedback</span>
        </button>

        <Link href="/" className={`mtab-btn${isHome ? " active" : ""}`} aria-label="Home">
          <IconHome size={22} stroke={1.8} />
          <span>Home</span>
        </Link>

        <button
          type="button"
          className={`mtab-btn${accountView ? " active" : ""}`}
          onClick={() => setAccountView("pick")}
          aria-label="Account"
          aria-expanded={!!accountView}
        >
          <IconUser size={22} stroke={1.8} />
          <span>Account</span>
        </button>

        <button
          type="button"
          className={`mtab-btn${settingsOpen ? " active" : ""}`}
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
            <div className="mtab-sheet">
              <div className="mtab-sheet-head">
                {accountView === "user-auth" ? (
                  <button
                    type="button"
                    className="mtab-sheet-close"
                    onClick={() => setAccountView("pick")}
                    aria-label="Back"
                  >
                    <IconArrowLeft size={18} stroke={2} />
                  </button>
                ) : (
                  <span style={{ width: 28 }} />
                )}
                <b>{accountView === "pick" ? "Account" : authMode === "login" ? "Đăng nhập" : "Đăng ký"}</b>
                <button type="button" className="mtab-sheet-close" onClick={closeAccount} aria-label="Close">
                  <IconX size={18} stroke={2} />
                </button>
              </div>

              {accountView === "pick" && (
                <div className="mtab-acct-list">
                  {user ? (
                    <>
                      <div className="mtab-sheet-row">
                        <span className="mtab-sheet-row-ico">
                          <IconUserCircle size={20} stroke={1.8} />
                        </span>
                        <span className="mtab-acct-body">
                          <b>
                            {user.firstname} {user.lastname}
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
                    </>
                  ) : (
                    <button
                      type="button"
                      className="mtab-sheet-row mtab-sheet-row-btn"
                      onClick={() => setAccountView("user-auth")}
                    >
                      <span className="mtab-sheet-row-ico">
                        <IconUserCircle size={20} stroke={1.8} />
                      </span>
                      <span className="mtab-acct-body">
                        <b>User</b>
                        <small>Đăng nhập / đăng ký bằng tài khoản & mật khẩu</small>
                      </span>
                    </button>
                  )}
                  {!user && (
                    <button
                      type="button"
                      className="mtab-sheet-row mtab-sheet-row-btn"
                      onClick={() => {
                        closeAccount();
                        router.push("/admin");
                      }}
                    >
                      <span className="mtab-sheet-row-ico">
                        <IconShieldLock size={20} stroke={1.8} />
                      </span>
                      <span className="mtab-acct-body">
                        <b>Manager</b>
                        <small>Vào khu vực quản trị</small>
                      </span>
                    </button>
                  )}
                </div>
              )}

              {accountView === "user-auth" && authMode === "login" && (
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
                      placeholder="Tên tài khoản"
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
                      placeholder="Mật khẩu"
                    />
                  </label>
                  {authErr && <small className="mtab-acct-err">{authErr}</small>}
                  <button type="submit" className="fx-btn fx-btn-primary" disabled={!accountname || !password || busy}>
                    {busy ? "Đang xử lý..." : "Đăng nhập"}
                  </button>
                  <button
                    type="button"
                    className="fx-btn"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthErr("");
                    }}
                  >
                    Chưa có tài khoản? Đăng ký
                  </button>
                </form>
              )}

              {accountView === "user-auth" && authMode === "register" && (
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
                      placeholder="First name"
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
                      placeholder="Last name"
                    />
                  </label>
                  <label className="mtab-acct-input">
                    <IconUserCircle size={16} stroke={1.8} />
                    <input
                      className="fx-input"
                      type="text"
                      value={accountname}
                      onChange={(e) => setAccountname(e.target.value)}
                      placeholder="Tên tài khoản"
                    />
                  </label>
                  <label className="mtab-acct-input">
                    <IconLock size={16} stroke={1.8} />
                    <input
                      className="fx-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                    />
                  </label>
                  {authErr && <small className="mtab-acct-err">{authErr}</small>}
                  <button
                    type="submit"
                    className="fx-btn fx-btn-primary"
                    disabled={!firstname || !lastname || !accountname || password.length < 6 || busy}
                  >
                    {busy ? "Đang xử lý..." : "Tạo tài khoản"}
                  </button>
                  <button
                    type="button"
                    className="fx-btn"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthErr("");
                    }}
                  >
                    Đã có tài khoản? Đăng nhập
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
