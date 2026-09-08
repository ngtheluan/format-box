import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import AdminLogin from "./AdminLogin";

export const dynamic = "force-dynamic";

export default function AdminIndexPage() {
  if (isAdmin()) redirect("/admin/menu");
  return <AdminLogin />;
}
