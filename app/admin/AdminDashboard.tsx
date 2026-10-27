"use client";
import { ADMIN_APPS, type AdminApp } from "@/lib/admin-apps";
import { TOOL_ICONS } from "@/lib/tool-icons";
import { IconLayoutGrid } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import AdminBody from "./AdminBody";

type Role = "user" | "admin" | "superadmin";

export default function AdminDashboard() {
  const [role, setRole] = useState<Role | null>(null);
  const [visibility, setVisibility] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/user/me").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/admin-menu").then((r) => r.json()).catch(() => null),
    ]).then(([me, menu]) => {
      if (!alive) return;
      setRole(((me?.user?.role as Role) ?? "user"));
      setVisibility(menu?.ok ? (menu.visibility as Record<string, boolean>) : {});
    });
    return () => {
      alive = false;
    };
  }, []);

  const apps: AdminApp[] | null = useMemo(() => {
    if (role === null || visibility === null) return null;
    if (role === "superadmin") return ADMIN_APPS;
    return ADMIN_APPS.filter((a) => visibility[a.href] !== false);
  }, [role, visibility]);

  return (
    <AdminBody
      crumbs={[{ label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} />, current: true }]}
      title="Admin Apps"
      description="Chọn một app để quản lý."
    >
      <div className="fx-app-grid">
        {apps === null
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="fx-card fx-app-card"
                style={{ opacity: 0.35, pointerEvents: "none", minHeight: 72 }}
              />
            ))
          : apps.map((a) => {
              const Icon = TOOL_ICONS[a.iconName] ?? IconLayoutGrid;
              return (
                <a key={a.href} href={a.href} className="fx-card fx-app-card">
                  <span className="fx-app-icon">
                    <Icon size={20} stroke={1.7} />
                  </span>
                  <span className="fx-app-info">
                    <b>{a.title}</b>
                    <span>{a.desc}</span>
                    <small>{a.href}</small>
                  </span>
                </a>
              );
            })}
      </div>
    </AdminBody>
  );
}
