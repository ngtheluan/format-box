"use client";
import { useTools } from "@/components/ToolsProvider";
import { ToolIcon } from "@/lib/tool-icons";
import { useI18n } from "@/lib/i18n";
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
              <svg viewBox="0 0 26 26">
                <rect x="2" y="2" width="22" height="22" />
                <line x1="2" y1="13" x2="24" y2="13" />
                <line x1="13" y1="2" x2="13" y2="24" />
              </svg>
              <b>
                Format<span>Box</span>
              </b>
            </div>
            <p>{t("ft_desc")}</p>
          </div>

          <div className="ft-col ft-col-tools">
            <h4>{t("ft_tools")}</h4>
            <div className="ft-tools-grid">
              {TOOLS.map((tool) => (
                <Link key={tool.href} href={tool.href} className="ft-tool">
                  <ToolIcon name={tool.iconName} size={14} stroke={1.9} />
                  <span>{tool.title}</span>
                  <IconArrowUpRight size={12} stroke={1.9} className="ft-tool-arr" />
                </Link>
              ))}
            </div>
          </div>

          <div className="ft-col ft-col-author">
            <h4>{t("ft_author")}</h4>
            <div className="ft-author">
              <div className="ft-avatar">L</div>
              <div className="ft-author-info">
                <b>Luân</b>
                <a href="mailto:nguyenluan.work@gmail.com">
                  <IconMail size={12} stroke={1.9} /> nguyenluan.work@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="ft-bottom">
          <span>{t("ft_copy")}</span>
          <span className="mono">{t("ft_stack")}</span>
        </div>
      </div>
    </footer>
  );
}
