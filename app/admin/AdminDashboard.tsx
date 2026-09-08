"use client";
import { IconComponents, IconLayoutGrid, IconListDetails } from "@tabler/icons-react";
import type { ReactNode } from "react";
import AdminHeader from "./AdminHeader";
import "./admin.css";

type AdminApp = {
  href: string;
  title: string;
  desc: string;
  icon: ReactNode;
};

const ADMIN_APPS: AdminApp[] = [
  {
    href: "/admin/menu",
    title: "Menu",
    desc: "Quản lý danh sách tools hiển thị ngoài trang chủ.",
    icon: <IconListDetails size={20} stroke={1.7} />,
  },
  {
    href: "/admin/ui",
    title: "UI Kit",
    desc: "Bộ component dùng chung — Button, Input, Modal…",
    icon: <IconComponents size={20} stroke={1.7} />,
  },
];

export default function AdminDashboard() {
  return (
    <div className="fx-scope fx-shell">
      <AdminHeader
        crumbs={[
          { label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} />, current: true },
        ]}
      />
      <div className="fx-body">
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
            Admin Apps
          </h1>
          <p style={{ fontSize: 13, opacity: 0.62, marginTop: 4 }}>
            Chọn một app để quản lý.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {ADMIN_APPS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="fx-card"
              style={{
                display: "flex",
                gap: 12,
                padding: 16,
                borderRadius: 12,
                border: "1px solid var(--fx-border, rgba(0,0,0,0.08))",
                background: "var(--fx-card, #fff)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.04)",
                  flexShrink: 0,
                }}
              >
                {a.icon}
              </span>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>{a.title}</b>
                <span style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{a.desc}</span>
                <span style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{a.href}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
