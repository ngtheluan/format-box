"use client";
import { useI18n } from "@/lib/i18n";
import { IconChartDots3 } from "@tabler/icons-react";
import GraphTool from "./GraphTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <div className="page">
      <h1 className="page-title">
        <IconChartDots3 size={22} stroke={1.8} /> JSON <span>{t("graph_title")}</span>
      </h1>
      <p className="sub">{t("graph_sub")}</p>
      <GraphTool />
    </div>
  );
}
