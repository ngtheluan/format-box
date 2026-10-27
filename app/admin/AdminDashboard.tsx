import { ADMIN_APPS, type AdminApp } from "@/lib/admin-apps";
import { isSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { TOOL_ICONS } from "@/lib/tool-icons";
import { IconLayoutGrid } from "@tabler/icons-react";
import AdminBody from "./AdminBody";

async function loadVisibleApps(): Promise<AdminApp[]> {
  if (await isSuperAdmin()) return ADMIN_APPS;
  try {
    const { data } = await supabaseAdmin()
      .from("admin_menu_visibility")
      .select("href, visible_admin");
    const hidden = new Set((data ?? []).filter((r) => r.visible_admin === false).map((r) => r.href));
    return ADMIN_APPS.filter((a) => !hidden.has(a.href));
  } catch {
    return ADMIN_APPS;
  }
}

export default async function AdminDashboard() {
  const apps = await loadVisibleApps();
  return (
    <AdminBody
      crumbs={[{ label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} />, current: true }]}
      title="Admin Apps"
      description="Chọn một app để quản lý."
    >
      <div className="fx-app-grid">
        {apps.map((a) => {
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
