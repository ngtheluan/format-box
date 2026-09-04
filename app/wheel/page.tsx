"use client";
import { IconConfetti } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import WheelTool from "./WheelTool";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconConfetti size={22} stroke={1.8} /> Lucky <span>{t("wh_title")}</span>
        </h1>
        <p className="sub">{t("wh_sub")}</p>
        <WheelTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
