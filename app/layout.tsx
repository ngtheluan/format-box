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
import { supabaseAdmin } from "@/lib/supabase";
import { currentUser } from "@/lib/user-auth";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://formatbox.site").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FormatBox — Bộ công cụ chuyển đổi & định dạng dữ liệu online",
  description:
    "FormatBox là bộ công cụ online miễn phí cho lập trình viên: định dạng JSON, mã hoá Base64, chuyển đổi hình ảnh, tra cứu tỷ giá, giá vàng, giá xăng...",
  keywords: ["FormatBox", "công cụ online", "JSON formatter", "Base64", "chuyển đổi dữ liệu", "developer tools"],
  authors: [{ name: "FormatBox" }],
  applicationName: "FormatBox",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "FormatBox",
    url: SITE_URL,
    title: "FormatBox — Bộ công cụ chuyển đổi & định dạng dữ liệu online",
    description:
      "Bộ công cụ online miễn phí cho lập trình viên Việt Nam: JSON, Base64, hình ảnh, tỷ giá, giá vàng, giá xăng. Mở là dùng, không cần cài đặt.",
    locale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
    title: "FormatBox — Bộ công cụ chuyển đổi & định dạng dữ liệu online",
    description: "JSON, Base64, hình ảnh, tỷ giá, giá vàng, giá xăng. Miễn phí, mở là dùng.",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "FormatBox",
      inLanguage: "vi-VN",
      description:
        "Bộ công cụ online miễn phí cho lập trình viên: định dạng JSON, mã hoá Base64, chuyển đổi hình ảnh, tra cứu tỷ giá, giá vàng, giá xăng.",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "FormatBox",
      url: SITE_URL,
      logo: `${SITE_URL}/apple-icon`,
    },
    {
      "@type": "WebApplication",
      name: "FormatBox",
      url: SITE_URL,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      inLanguage: ["vi-VN", "en"],
      offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
      description:
        "FormatBox là bộ công cụ online miễn phí cho lập trình viên Việt Nam, gồm JSON formatter, Base64, chuyển đổi hình ảnh, tra cứu tỷ giá hối đoái, giá vàng và giá xăng. Công cụ định dạng và mã hoá chạy ngay trong trình duyệt, dữ liệu giá được cập nhật qua server.",
    },
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1a2e" },
    { media: "(prefers-color-scheme: light)", color: "#f2f6fc" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = currentUser();
  const role: Role = session?.role ?? "guest";
  const allTools = await getTools();
  const initialTools = allTools.filter((t) => isToolVisible(t, role));
  let initialUser: { id: string; accountname: string; firstname: string; lastname: string; role: "user" | "admin" | "superadmin" } | null = null;
  if (session) {
    try {
      const { data } = await supabaseAdmin()
        .from("app_users")
        .select("id, accountname, firstname, lastname, role")
        .eq("id", session.userId)
        .maybeSingle();
      if (data) {
        const r = data.role === "superadmin" ? "superadmin" : data.role === "admin" ? "admin" : "user";
        initialUser = { id: data.id, accountname: data.accountname, firstname: data.firstname, lastname: data.lastname, role: r };
      }
    } catch {}
  }
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
        <meta name="google-site-verification" content="D8R9qU3Bhqzd1ac3m68dlRnoPFpstzoG9VNMkTAvymI" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('fb-theme');var t=(s==='dark'||s==='light')?s:'light';if(!s)localStorage.setItem('fb-theme','light');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`,
          }}
        />
      </head>
      <body>
        {/* Blueprint margin ruler on the left edge; the marker tracks page scroll. */}
        <div aria-hidden="true" className="margin-ruler">
          <div className="margin-ruler-marker" />
        </div>
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
                  <AppShell initialUser={initialUser}>{children}</AppShell>
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
