import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import UsersManager from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  if (!(await isAdmin())) redirect("/admin");
  return <UsersManager />;
}
