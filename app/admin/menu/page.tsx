import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import MenuManager from "./MenuManager";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  if (!(await isAdmin())) redirect("/admin");
  return <MenuManager />;
}
