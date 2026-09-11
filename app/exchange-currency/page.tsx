"use client";
import { useI18n } from "@/lib/i18n";
import { IconCurrencyDollar } from "@tabler/icons-react";
import ExchangeCurrencyTool from "./ExchangeCurrencyTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page" style={{ maxWidth: 1200 }}>
        <h1 className="page-title">
          <IconCurrencyDollar size={22} stroke={1.8} /> Exchange <span>{t("xc_title")}</span>
        </h1>
        <p className="sub">{t("xc_sub")}</p>
        <ExchangeCurrencyTool />
      </div>
    </>
  );
}
