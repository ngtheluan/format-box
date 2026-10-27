"use client";
import { useI18n } from "@/lib/i18n";
import { IconNews } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function BlogNavLink() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === "/blog" || pathname.startsWith("/blog/");
  return (
    <Link
      href="/blog"
      className={`nav-cta${active ? " active" : ""}`}
      onMouseEnter={() => router.prefetch("/blog")}
    >
      <IconNews size={15} stroke={2} />
      <span>{t("nav_blog")}</span>
    </Link>
  );
}
