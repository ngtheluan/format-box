import { IconShieldCheck, IconShieldLock, IconUser } from "@tabler/icons-react";

type Role = "user" | "admin" | "superadmin";

/**
 * Small chip signaling the signed-in viewer's role. Superadmin = locked shield
 * (full power), Admin = accent-colored shield, User = neutral user icon.
 */
export default function RoleBadge({ role, size = "sm" }: { role: Role; size?: "sm" | "xs" }) {
  const Icon = role === "superadmin" ? IconShieldLock : role === "admin" ? IconShieldCheck : IconUser;
  const label = role === "superadmin" ? "SUPERADMIN" : role === "admin" ? "ADMIN" : "USER";
  return (
    <span className={`role-badge role-badge-${role} role-badge-${size}`}>
      <Icon size={size === "xs" ? 10 : 12} stroke={2} />
      <span>{label}</span>
    </span>
  );
}
