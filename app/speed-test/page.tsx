"use client";
import { useI18n } from "@/lib/i18n";
import { IconGauge } from "@tabler/icons-react";
import SpeedTestTool from "./SpeedTestTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title">
          <IconGauge size={22} stroke={1.8} /> Speed Test <span>{t("st_title")}</span>
        </h1>
        <p className="sub">{t("st_sub")}</p>
        <SpeedTestTool />
      </div>
    </>
  );
}
