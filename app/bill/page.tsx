"use client";
import { IconReceipt } from "@tabler/icons-react";
import BillTool from "./BillTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page bill-page" style={{ maxWidth: 980 }}>
        <h1 className="page-title">
          <IconReceipt size={22} stroke={1.8} /> Bill <span>{t("bill_title")}</span>
        </h1>
        <p className="sub">{t("bill_sub")}</p>
        <BillTool />
      </div>
    </>
  );
}
