import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "FormatBox — Chuyển đổi dữ liệu ngay trên trình duyệt",
  description:
    "FormatBox — Base64, JSON, hình ảnh và nhiều hơn. Miễn phí, không upload, xử lý 100% client-side.",
  openGraph: {
    title: "FormatBox — Chuyển đổi dữ liệu ngay trên trình duyệt",
    description: "Base64, JSON, hình ảnh. Không upload, không đăng ký.",
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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
