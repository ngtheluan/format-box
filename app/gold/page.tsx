"use client";
import { IconCoin } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import GoldTool from "./GoldTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconCoin size={22} stroke={1.8} /> Gold <span>{t("gp_title")}</span>
        </h1>
        <p className="sub">{t("gp_sub")}</p>
        <GoldTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
