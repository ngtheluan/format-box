"use client";
import BannerBar from "@/components/BannerBar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import Nav from "@/components/Nav";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  // Blog pages hide the global Nav for an immersive, editorial reading experience;
  // navigation lives inside the blog's own translucent toolbar.
  const isBlog = pathname === "/blog" || pathname.startsWith("/blog/");
  const hideNav = isAdmin || isBlog;

  return (
    <div className={`app-shell${isBlog ? " app-shell--blog" : ""}`}>
      {!isAdmin && <BannerBar />}
      {!hideNav && <Nav />}
      <main className="app-main">{children}</main>
      {!isAdmin && <Footer />}
      {!isAdmin && <MobileTabBar />}
    </div>
  );
}
