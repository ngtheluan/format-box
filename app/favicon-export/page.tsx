"use client";
import { IconBrowser } from "@tabler/icons-react";
import FaviconExportTool from "./FaviconExportTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconBrowser size={22} stroke={1.8} /> Favicon <span>{t("fx_title")}</span>
        </h1>
        <p className="sub">{t("fx_sub")}</p>
        <FaviconExportTool />
      </div>
    </>
  );
}
