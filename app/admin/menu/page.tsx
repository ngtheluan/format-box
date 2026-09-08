import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import MenuTools from "./MenuTools";

export const dynamic = "force-dynamic";

export default function AdminMenuPage() {
  if (!isAdmin()) redirect("/admin");
  return <MenuTools />;
}
