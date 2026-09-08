"use client";
import { IconCurrencyDollar } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import ExchangeCurrencyTool from "./ExchangeCurrencyTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconCurrencyDollar size={22} stroke={1.8} /> Exchange <span>{t("xc_title")}</span>
        </h1>
        <p className="sub">{t("xc_sub")}</p>
        <ExchangeCurrencyTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
