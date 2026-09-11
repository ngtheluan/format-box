"use client";
import { IconBraces } from "@tabler/icons-react";
import JsonTool from "./JsonTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page" style={{ maxWidth: 1000 }}>
        <h1 className="page-title">
          <IconBraces size={22} stroke={1.8} /> JSON <span>{t("json_title")}</span>
        </h1>
        <p className="sub">{t("json_sub")}</p>
        <JsonTool />
      </div>
    </>
  );
}
