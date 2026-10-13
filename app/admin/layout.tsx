import { isAdmin } from "@/lib/admin-auth";
import AdminTabBar from "./AdminTabBar";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = isAdmin();
  return (
    <>
      {children}
      {authed && <AdminTabBar />}
    </>
  );
}
