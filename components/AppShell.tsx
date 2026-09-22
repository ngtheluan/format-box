"use client";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <div className="app-shell">
      {!isAdmin && <Nav />}
      <main className="app-main">{children}</main>
      {!isAdmin && <Footer />}
    </div>
  );
}
