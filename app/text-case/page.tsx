"use client";
import { useI18n } from "@/lib/i18n";
import { IconLetterCase } from "@tabler/icons-react";
import TextCaseTool from "./TextCaseTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title">
          <IconLetterCase size={22} stroke={1.8} /> Text <span>{t("tc_title")}</span>
        </h1>
        <p className="sub">{t("tc_sub")}</p>
        <TextCaseTool />
      </div>
    </>
  );
}
