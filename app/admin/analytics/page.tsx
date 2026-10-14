import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Thống kê · Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminAnalyticsPage() {
  if (!(await isAdmin())) redirect("/admin");
  return <AnalyticsClient />;
}
