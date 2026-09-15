"use client";
import { IconComponents, IconLayoutGrid, IconListDetails, IconMessageDots, IconMicrophone } from "@tabler/icons-react";
import type { ReactNode } from "react";
import AdminBody from "./AdminBody";

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
  {
    href: "/admin/feedback",
    title: "Liên hệ góp ý",
    desc: "Danh sách góp ý từ Google Sheet + file đính kèm Drive.",
    icon: <IconMessageDots size={20} stroke={1.7} />,
  },
  {
    href: "/admin/podcasts",
    title: "Podcasts",
    desc: "MachuTeam podcast — tập podcast + video YouTube.",
    icon: <IconMicrophone size={20} stroke={1.7} />,
  },
];

export default function AdminDashboard() {
  return (
    <AdminBody
      crumbs={[{ label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} />, current: true }]}
      title="Admin Apps"
      description="Chọn một app để quản lý."
    >
      <div className="fx-app-grid">
        {ADMIN_APPS.map((a) => (
          <a key={a.href} href={a.href} className="fx-card fx-app-card">
            <span className="fx-app-icon">{a.icon}</span>
            <span className="fx-app-info">
              <b>{a.title}</b>
              <span>{a.desc}</span>
              <small>{a.href}</small>
            </span>
          </a>
        ))}
      </div>
    </AdminBody>
  );
}
