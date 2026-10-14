import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import ThemeManager from "./ThemeManager";

export const dynamic = "force-dynamic";

export default async function AdminThemePage() {
  if (!(await isAdmin())) redirect("/admin");
  return <ThemeManager />;
}
