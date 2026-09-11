import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import MenuManager from "./MenuManager";

export const dynamic = "force-dynamic";

export default function AdminMenuPage() {
  if (!isAdmin()) redirect("/admin");
  return <MenuManager />;
}
