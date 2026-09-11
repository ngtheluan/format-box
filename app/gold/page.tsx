"use client";
import { useI18n } from "@/lib/i18n";
import { IconCoin } from "@tabler/icons-react";
import GoldTool from "./GoldTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page" style={{ maxWidth: 1200 }}>
        <h1 className="page-title">
          <IconCoin size={22} stroke={1.8} /> Gold <span>{t("gp_title")}</span>
        </h1>
        <p className="sub">{t("gp_sub")}</p>
        <GoldTool />
      </div>
    </>
  );
}
