"use client";
import { IconDevices } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import ResponsiveTool from "./ResponsiveTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1400 }}>
        <h1 className="page-title">
          <IconDevices size={22} stroke={1.8} /> Responsive <span>{t("rt_title")}</span>
        </h1>
        <p className="sub">{t("rt_sub")}</p>
        <ResponsiveTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
