"use client";
import { IconTerminal2 } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import CurlTool from "./CurlTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1300 }}>
        <h1 className="page-title">
          <IconTerminal2 size={22} stroke={1.8} /> cURL <span>{t("cu_title")}</span>
        </h1>
        <p className="sub">{t("cu_sub")}</p>
        <CurlTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
