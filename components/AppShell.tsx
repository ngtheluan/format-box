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
  const isImmersive = pathname === "/gift" || pathname.startsWith("/gift/");
  const hideNav = isAdmin || isBlog || isImmersive;
  const hideChrome = isAdmin || isImmersive;

  return (
    <div className={`app-shell${isBlog ? " app-shell--blog" : ""}${isImmersive ? " app-shell--immersive" : ""}`}>
      {!hideChrome && <BannerBar />}
      {!hideNav && <Nav />}
      <main className="app-main">{children}</main>
      {!hideChrome && <Footer />}
      {!hideChrome && <MobileTabBar />}
    </div>
  );
}
