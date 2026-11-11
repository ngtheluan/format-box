"use client";
import { useI18n } from "@/lib/i18n";
import { IconHome, IconNews } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function BlogNavLink() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const inBlog = pathname === "/blog" || pathname.startsWith("/blog/");
  const href = inBlog ? "/" : "/blog";
  const label = inBlog ? t("mtab_home") : t("nav_blog");
  const Icon = inBlog ? IconHome : IconNews;
  return (
    <Link
      href={href}
      className={`nav-cta${inBlog ? " active" : ""}`}
      onMouseEnter={() => router.prefetch(href)}
    >
      <Icon size={15} stroke={2} />
      <span>{label}</span>
    </Link>
  );
}
