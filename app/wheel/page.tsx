"use client";
import { useI18n } from "@/lib/i18n";
import { IconConfetti } from "@tabler/icons-react";
import WheelTool from "./WheelTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title">
          <IconConfetti size={22} stroke={1.8} /> Lucky <span>{t("wh_title")}</span>
        </h1>
        <p className="sub">{t("wh_sub")}</p>
        <WheelTool />
      </div>
    </>
  );
}
