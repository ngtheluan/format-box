import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import UsersManager from "./UsersManager";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  if (!isAdmin()) redirect("/admin");
  return <UsersManager />;
}
