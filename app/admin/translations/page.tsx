import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import TranslationsManager from "./TranslationsManager";

export const dynamic = "force-dynamic";

export default async function AdminTranslationsPage() {
  if (!(await isAdmin())) redirect("/admin");
  return <TranslationsManager />;
}
