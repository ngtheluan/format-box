"use client";
import { useI18n } from "@/lib/i18n";
import { IconCloud } from "@tabler/icons-react";
import WeatherTool from "./WeatherTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <h1 className="page-title">
        <IconCloud size={22} stroke={1.8} /> Weather <span>{t("wt_title")}</span>
      </h1>
      <p className="sub">{t("wt_sub")}</p>
      <WeatherTool />
    </div>
  );
}
