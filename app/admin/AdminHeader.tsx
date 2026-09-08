"use client";
import { IconChevronRight, IconLogout, IconSearch } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import "./admin.css";

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

export default function AdminHeader({ crumbs, search, actions, showLogout = true, onLogout }: AdminHeaderProps) {
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

          <div className="fx-actions">
            {actions}
            {showLogout && (
              <button
                onClick={onLogout ?? defaultLogout}
                className="fx-btn fx-btn-ghost"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <IconLogout size={14} stroke={1.9} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
