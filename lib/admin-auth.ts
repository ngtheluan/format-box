// Admin access is now granted to any user with role='admin'. The old
// password-cookie flow (ADMIN_COOKIE / makeAdminToken) is retired — all admin
// APIs and the /admin area check the user session instead.
import { currentUser } from "./user-auth";

export function isAdmin(): boolean {
  return currentUser()?.role === "admin";
}
