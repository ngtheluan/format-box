"use client";
import { useI18n } from "@/lib/i18n";
import { IconPhoto } from "@tabler/icons-react";
import ImageTool from "./ImageTool";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title">
          <IconPhoto size={22} stroke={1.8} /> Image <span>{t("img_title")}</span>
        </h1>
        <p className="sub">{t("img_sub2")}</p>
        <ImageTool />
      </div>
    </>
  );
}
