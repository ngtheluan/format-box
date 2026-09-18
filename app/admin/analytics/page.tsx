import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  if (!isAdmin()) redirect("/admin");
  return <AnalyticsClient />;
}
