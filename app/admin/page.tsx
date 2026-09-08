import { isAdmin } from "@/lib/admin-auth";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default function AdminIndexPage() {
  if (!isAdmin()) return <AdminLogin />;
  return <AdminDashboard />;
}
