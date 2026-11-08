"use client";

import { Alert } from "@/components/ui";
import { isAutoStalled } from "@/lib/blog-ai-shared";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { useEffect, useState } from "react";

const POLL_MS = 30_000;

// Render for superadmins only: other roles get a status payload without the
// fields needed here, and public visitors shouldn't poll at all.
export function AutoStallAlert() {
  const { t } = useI18n();
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch("/api/blog/auto/status", { cache: "no-store" });
        if (!r.ok) return;
        const status = await r.json();
        if (!cancelled) setStalled(isAutoStalled(status, Date.now()));
      } catch {}
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!stalled) return null;
  return (
    <Alert tone="warning" title={t("blog_auto_stalled_title")} style={{ marginBottom: 12 }}>
      {t("blog_auto_stalled_desc")} <Link href="/admin/blog">{t("blog_auto_stalled_link")}</Link>
    </Alert>
  );
}
