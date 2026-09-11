"use client";
import { IconTicket } from "@tabler/icons-react";
import LuckyTicketTool from "./LuckyTicketTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconTicket size={22} stroke={1.8} /> Lucky Ticket <span>{t("lt_title")}</span>
        </h1>
        <p className="sub">{t("lt_sub")}</p>
        <LuckyTicketTool />
      </div>
    </>
  );
}
