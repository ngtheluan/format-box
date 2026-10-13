import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import TranslationsManager from "./TranslationsManager";

export const dynamic = "force-dynamic";

export default function AdminTranslationsPage() {
  if (!isAdmin()) redirect("/admin");
  return <TranslationsManager />;
}
