"use client";
import { useI18n } from "@/lib/i18n";
import { IconPalette } from "@tabler/icons-react";
import ColorTool from "./ColorTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title">
          <IconPalette size={22} stroke={1.8} /> Color <span>{t("cl_title")}</span>
        </h1>
        <p className="sub">{t("cl_sub")}</p>
        <ColorTool />
      </div>
    </>
  );
}
