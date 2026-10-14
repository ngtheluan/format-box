import { isAdmin } from "@/lib/admin-auth";
import AdminLogin from "./AdminLogin";
import AdminTabBar from "./AdminTabBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Single live gate for the whole /admin area: the viewer's CURRENT DB role
  // must be admin. Role changes apply on the next request, no re-login needed.
  if (!(await isAdmin())) return <AdminLogin />;
  return (
    <>
      {children}
      <AdminTabBar />
    </>
  );
}
