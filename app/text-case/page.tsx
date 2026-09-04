"use client";
import { IconLetterCase } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import TextCaseTool from "./TextCaseTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconLetterCase size={22} stroke={1.8} /> Text <span>{t("tc_title")}</span>
        </h1>
        <p className="sub">{t("tc_sub")}</p>
        <TextCaseTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
