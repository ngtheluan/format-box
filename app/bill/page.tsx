"use client";
import { useI18n } from "@/lib/i18n";
import { IconReceipt } from "@tabler/icons-react";
import BillTool from "./BillTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title">
          <IconReceipt size={22} stroke={1.8} /> Bill <span>{t("bill_title")}</span>
        </h1>
        <p className="sub">{t("bill_sub")}</p>
        <BillTool />
      </div>
    </>
  );
}
