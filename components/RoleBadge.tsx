import { IconShieldCheck, IconUser } from "@tabler/icons-react";

type Role = "user" | "admin";

/**
 * Small chip signaling the signed-in viewer's role. Admin = accent-colored
 * shield, User = neutral user icon. Shared by AccountMenu, MobileTabBar and
 * AdminHeader so the role is instantly recognizable everywhere.
 */
export default function RoleBadge({ role, size = "sm" }: { role: Role; size?: "sm" | "xs" }) {
  const isAdmin = role === "admin";
  const Icon = isAdmin ? IconShieldCheck : IconUser;
  return (
    <span className={`role-badge role-badge-${isAdmin ? "admin" : "user"} role-badge-${size}`}>
      <Icon size={size === "xs" ? 10 : 12} stroke={2} />
      <span>{isAdmin ? "ADMIN" : "USER"}</span>
    </span>
  );
}
