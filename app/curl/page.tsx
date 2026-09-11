"use client";
import { useI18n } from "@/lib/i18n";
import { IconTerminal2 } from "@tabler/icons-react";
import CurlTool from "./CurlTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title">
          <IconTerminal2 size={22} stroke={1.8} /> cURL <span>{t("cu_title")}</span>
        </h1>
        <p className="sub">{t("cu_sub")}</p>
        <CurlTool />
      </div>
    </>
  );
}
