"use client";
import { IconLock } from "@tabler/icons-react";
import Base64Tool from "./Base64Tool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <div className="page">
        <h1 className="page-title">
          <IconLock size={22} stroke={1.8} /> Base64 <span>{t("b64_title")}</span>
        </h1>
        <p className="sub">{t("b64_sub")}</p>
        <Base64Tool />
      </div>
    </>
  );
}
