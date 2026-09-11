"use client";
import { useI18n } from "@/lib/i18n";
import { IconGasStation } from "@tabler/icons-react";
import FuelTool from "./FuelTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page" style={{ maxWidth: 1200 }}>
        <h1 className="page-title">
          <IconGasStation size={22} stroke={1.8} /> Fuel <span>{t("fp_title")}</span>
        </h1>
        <p className="sub">{t("fp_sub")}</p>
        <FuelTool />
      </div>
    </>
  );
}
