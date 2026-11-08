"use client";
import BannerBar from "@/components/BannerBar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import Nav from "@/components/Nav";
import { usePathname } from "next/navigation";

type InitialUser = { id: string; accountname: string; firstname: string; lastname: string; role: "user" | "admin" | "superadmin" } | null;

export default function AppShell({ children, initialUser = null }: { children: React.ReactNode; initialUser?: InitialUser }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isBlog = pathname === "/blog" || pathname.startsWith("/blog/");
  const isImmersive = pathname === "/gift" || pathname.startsWith("/gift/");
  const hideNav = isAdmin || isImmersive;
  const hideChrome = isAdmin || isImmersive;

  return (
    <div className={`app-shell${isBlog ? " app-shell--blog" : ""}${isImmersive ? " app-shell--immersive" : ""}`}>
      {!hideChrome && <BannerBar />}
      {!hideNav && <Nav initialUser={initialUser} />}
      <main className="app-main">{children}</main>
      {!hideChrome && <Footer />}
      {!hideChrome && <MobileTabBar />}
    </div>
  );
}
