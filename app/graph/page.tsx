"use client";
import { IconChartDots3 } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import GraphTool from "./GraphTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <Nav />
      <div className="page graph-page">
        <h1 className="page-title">
          <IconChartDots3 size={22} stroke={1.8} /> JSON <span>{t("graph_title")}</span>
        </h1>
        <p className="sub">{t("graph_sub")}</p>
        <GraphTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
