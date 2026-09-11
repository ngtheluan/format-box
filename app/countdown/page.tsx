"use client";
import { useI18n } from "@/lib/i18n";
import { IconClock } from "@tabler/icons-react";
import CountdownTool from "./CountdownTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title">
          <IconClock size={22} stroke={1.8} /> Countdown <span>{t("cd_title")}</span>
        </h1>
        <p className="sub">{t("cd_sub")}</p>
        <CountdownTool />
      </div>
    </>
  );
}
