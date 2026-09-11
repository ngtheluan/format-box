"use client";
import { useI18n } from "@/lib/i18n";
import { IconCalendar } from "@tabler/icons-react";
import CalendarTool from "./CalendarTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title">
          <IconCalendar size={22} stroke={1.8} /> Calendar <span>{t("cal_title")}</span>
        </h1>
        <p className="sub">{t("cal_sub")}</p>
        <CalendarTool />
      </div>
    </>
  );
}
