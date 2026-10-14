"use client";
import { LogoMark } from "@/components/Logo";
import RoleBadge from "@/components/RoleBadge";
import { IconChevronRight, IconLogout, IconSearch, IconUserCircle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import "./admin.css";

type Role = "user" | "admin";
type Me = { firstname: string; lastname: string; accountname: string; role?: Role };

export type AdminCrumb = {
  label: string;
  icon?: ReactNode;
  current?: boolean;
  badge?: ReactNode;
  href?: string;
  onClick?: () => void;
};

export type AdminHeaderProps = {
  crumbs?: AdminCrumb[];
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  actions?: ReactNode;
  showLogout?: boolean;
  onLogout?: () => void;
};

async function defaultLogout() {
  await fetch("/api/admin/login", { method: "DELETE" });
  window.location.href = "/admin";
}

const MODE_KEY = "fb-mode";

export default function AdminHeader({ crumbs, search, actions, showLogout = true, onLogout }: AdminHeaderProps) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  function switchMode(next: "user" | "admin") {
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {}
    window.dispatchEvent(new CustomEvent("fb:mode-change", { detail: { mode: next } }));
    if (next === "user") router.push("/");
    else router.push("/admin");
  }

  useEffect(() => {
    let alive = true;
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setMe(d?.user ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return (
    <>
      <div className="fx-stripe" />
      <div className="fx-top">
        <div className="fx-top-inner">
          <a href="/admin" className="fx-brand" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="fx-brand-mark">
              <LogoMark variant="admin" size={26} />
            </span>
            <span className="fx-brand-text">
              <span className="fx-brand-title">FormatBox</span>
              <span className="fx-brand-sub">Admin Panel</span>
            </span>
          </a>

          {crumbs && crumbs.length > 0 && (
            <div className="fx-crumbs">
              {crumbs.map((c, i) => {
                const clickable = !c.current && (c.href || c.onClick);
                const inner = (
                  <>
                    {c.icon}
                    <span className={c.current ? "cur" : ""}>{c.label}</span>
                    {c.badge}
                  </>
                );
                const linkStyle = {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: 0,
                  font: "inherit",
                } as const;
                return (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {i > 0 && <IconChevronRight size={12} stroke={1.8} className="sep" />}
                    {clickable ? (
                      c.href ? (
                        <a href={c.href} onClick={c.onClick} className="fx-crumb-link" style={linkStyle}>
                          {inner}
                        </a>
                      ) : (
                        <button type="button" onClick={c.onClick} className="fx-crumb-link" style={linkStyle}>
                          {inner}
                        </button>
                      )
                    ) : (
                      inner
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {me?.role === "admin" && (
            <div className="lang-toggle fx-mode-toggle" role="group" aria-label="Mode">
              <button
                type="button"
                onClick={() => switchMode("user")}
                aria-pressed={false}
                title="Chuyển sang chế độ User"
              >
                USER
              </button>
              <button type="button" className="on" aria-pressed={true} title="Đang ở chế độ Admin">
                ADMIN
              </button>
            </div>
          )}

          {me && (
            <span
              className="fx-me"
              title={`@${me.accountname}`}
              aria-label={`${me.firstname} ${me.lastname}${me.role === "admin" ? " (Admin)" : ""}`}
            >
              <IconUserCircle size={16} stroke={1.8} />
              <span className="fx-me-name">
                {me.firstname} {me.lastname}
              </span>
              <RoleBadge role={me.role ?? "user"} size="xs" />
            </span>
          )}

          {showLogout && (
            <button
              onClick={onLogout ?? defaultLogout}
              className="fx-btn fx-btn-ghost fx-logout"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <IconLogout size={14} stroke={1.9} />
            </button>
          )}

          {(search || actions) && (
            <div className="fx-top-right">
              {search && (
                <div className="fx-search">
                  <IconSearch size={14} stroke={1.9} />
                  <input
                    value={search.value}
                    onChange={(e) => search.onChange(e.target.value)}
                    placeholder={search.placeholder ?? "Tìm kiếm…"}
                  />
                </div>
              )}
              {actions && <div className="fx-actions">{actions}</div>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
