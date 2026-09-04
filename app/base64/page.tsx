"use client";
import { IconLock } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import Base64Tool from "./Base64Tool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <Nav />
      <div className="page">
        <h1 className="page-title">
          <IconLock size={22} stroke={1.8} /> Base64 <span>{t("b64_title")}</span>
        </h1>
        <p className="sub">{t("b64_sub")}</p>
        <Base64Tool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
