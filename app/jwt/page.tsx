"use client";
import { IconKey } from "@tabler/icons-react";
import JwtTool from "./JwtTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconKey size={22} stroke={1.8} /> JWT <span>{t("jwt_title")}</span>
        </h1>
        <p className="sub">{t("jwt_sub")}</p>
        <JwtTool />
      </div>
    </>
  );
}
