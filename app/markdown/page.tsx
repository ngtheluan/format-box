"use client";
import { IconMarkdown } from "@tabler/icons-react";
import MarkdownTool from "./MarkdownTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page" style={{ maxWidth: 1240 }}>
        <h1 className="page-title">
          <IconMarkdown size={22} stroke={1.8} /> Markdown <span>{t("md_title")}</span>
        </h1>
        <p className="sub">{t("md_sub")}</p>
        <MarkdownTool />
      </div>
    </>
  );
}
