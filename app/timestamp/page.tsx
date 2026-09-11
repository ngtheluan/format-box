"use client";
import { IconClockHour4 } from "@tabler/icons-react";
import TimestampTool from "./TimestampTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconClockHour4 size={22} stroke={1.8} /> Timestamp <span>{t("ts_title")}</span>
        </h1>
        <p className="sub">{t("ts_sub")}</p>
        <TimestampTool />
      </div>
    </>
  );
}
