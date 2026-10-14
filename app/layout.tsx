import AppShell from "@/components/AppShell";
import ScrollTop from "@/components/ScrollTop";
import SkinScene from "@/components/SkinSceneLazy";
import { ThemesProvider } from "@/components/ThemesProvider";
import TitleUpdater from "@/components/TitleUpdater";
import { ToastProvider } from "@/components/Toast";
import { ToolsProvider } from "@/components/ToolsProvider";
import { LanguageProvider } from "@/lib/i18n";
import { SkinProvider } from "@/lib/skin-context";
import { getTools } from "@/lib/tools";
import { isToolVisible, type Role } from "@/lib/tools-shared";
import { currentUser } from "@/lib/user-auth";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormatBox — Chuyển đổi dữ liệu ngay trên trình duyệt",
  description: "FormatBox — Base64, JSON, hình ảnh và nhiều hơn. Miễn phí, xử lý 100% client-side.",
  openGraph: {
    title: "FormatBox — Chuyển đổi dữ liệu ngay trên trình duyệt",
    description: "Base64, JSON, hình ảnh. Không đăng ký.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070912" },
    { media: "(prefers-color-scheme: light)", color: "#f3f4fb" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role: Role = currentUser()?.role ?? "guest";
  const allTools = await getTools();
  const initialTools = allTools.filter((t) => isToolVisible(t, role));
  return (
    <html lang="vi" data-theme="light" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        {/* To start counting visitors and page views, follow these steps. */}
        <Analytics />
        {/* To start collecting performance metrics, follow these steps. */}
        <SpeedInsights />
        <LanguageProvider>
          <ThemesProvider>
            <SkinProvider>
              <ToolsProvider initialTools={initialTools}>
                <SkinScene />
                <TitleUpdater />
                <ToastProvider>
                  <AppShell>{children}</AppShell>
                </ToastProvider>
                <ScrollTop />
              </ToolsProvider>
            </SkinProvider>
          </ThemesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
