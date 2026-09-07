"use client";
import { IconCalendar } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import CalendarTool from "./CalendarTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconCalendar size={22} stroke={1.8} /> Calendar <span>{t("cal_title")}</span>
        </h1>
        <p className="sub">{t("cal_sub")}</p>
        <CalendarTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
