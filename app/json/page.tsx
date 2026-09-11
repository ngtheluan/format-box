"use client";
import { useI18n } from "@/lib/i18n";
import { IconBraces } from "@tabler/icons-react";
import JsonTool from "./JsonTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title" style={{ marginBottom: 16 }}>
          <IconBraces size={22} stroke={1.8} /> JSON <span>{t("json_title")}</span>
        </h1>
        <JsonTool />
      </div>
    </>
  );
}
