"use client";
import Nav from "@/components/Nav";
import { IconPhoto } from "@tabler/icons-react";
import ImageTool from "./ImageTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1200 }}>
        <h1 className="page-title">
          <IconPhoto size={22} stroke={1.8} /> Image <span>{t("img_title")}</span>
        </h1>
        <p className="sub">{t("img_sub2")}</p>
        <ImageTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
