import AdminTabBar from "./AdminTabBar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdminTabBar />
    </>
  );
}
