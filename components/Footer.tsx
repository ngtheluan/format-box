"use client";
import { LogoMark } from "@/components/Logo";
import { useTools } from "@/components/ToolsProvider";
import { useI18n } from "@/lib/i18n";
import { ToolIcon } from "@/lib/tool-icons";
import { IconArrowUpRight, IconMail } from "@tabler/icons-react";
import Link from "next/link";

export default function Footer() {
  const { t } = useI18n();
  const TOOLS = useTools();

  return (
    <footer className="ft">
      <div className="ft-inner">
        <div className="ft-top">
          <div className="ft-brand">
            <div className="logo" style={{ cursor: "default" }}>
              <LogoMark />
              <b>
                Format<span>Box</span>
              </b>
            </div>
            <p>{t("ft_desc")}</p>
            <a className="ft-mail" href="mailto:nguyenluan.work@gmail.com">
              <IconMail size={13} stroke={1.9} />
              <span>nguyenluan.work@gmail.com</span>
            </a>
          </div>

          <div className="ft-col ft-col-tools">
            <h4>{t("ft_tools")}</h4>
            <div className="ft-tools-grid">
              {TOOLS.map((tool) => (
                <Link key={tool.href} href={tool.href} className="ft-tool">
                  <ToolIcon name={tool.iconName} size={13} stroke={1.9} />
                  <span>{tool.title}</span>
                  <IconArrowUpRight size={11} stroke={1.9} className="ft-tool-arr" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="ft-bottom">
          <span>{t("ft_copy")}</span>
          <span className="mono">
            {process.env.NEXT_PUBLIC_APP_VERSION}
            {process.env.NEXT_PUBLIC_APP_COMMIT ? ` · ${process.env.NEXT_PUBLIC_APP_COMMIT}` : ""}
            {" · Next.js"}
          </span>
        </div>
      </div>
    </footer>
  );
}
