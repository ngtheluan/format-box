"use client";
import { IconCloud } from "@tabler/icons-react";
import WeatherTool from "./WeatherTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconCloud size={22} stroke={1.8} /> Weather <span>{t("wt_title")}</span>
        </h1>
        <p className="sub">{t("wt_sub")}</p>
        <WeatherTool />
      </div>
    </>
  );
}
