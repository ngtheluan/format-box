import AppShell from "@/components/AppShell";
import NavigationProgress from "@/components/NavigationProgress";
import ScrollTop from "@/components/ScrollTop";
import TitleUpdater from "@/components/TitleUpdater";
import { ToastProvider } from "@/components/Toast";
import { ToolsProvider } from "@/components/ToolsProvider";
import { LanguageProvider } from "@/lib/i18n";
import { themeInitScript } from "@/lib/theme";
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
  themeColor: "#0a0e15",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <LanguageProvider>
          <ToolsProvider>
            <NavigationProgress />
            <TitleUpdater />
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
            <ScrollTop />
          </ToolsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
