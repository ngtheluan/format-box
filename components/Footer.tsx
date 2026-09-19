"use client";
import { useI18n } from "@/lib/i18n";
import { IconMail } from "@tabler/icons-react";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="ft">
      <div className="ft-inner ft-line">
        <span>{t("ft_copy")}</span>
        <a className="ft-mail" href="mailto:nguyenluan.work@gmail.com">
          <IconMail size={13} stroke={1.9} />
          <span>nguyenluan.work@gmail.com</span>
        </a>
        <span className="mono">
          {process.env.NEXT_PUBLIC_APP_VERSION}
          {process.env.NEXT_PUBLIC_APP_COMMIT ? ` · ${process.env.NEXT_PUBLIC_APP_COMMIT}` : ""}
          {" · Next.js"}
        </span>
      </div>
    </footer>
  );
}
