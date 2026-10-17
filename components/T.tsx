"use client";

import { useI18n } from "@/lib/i18n";
import type { DICT } from "@/lib/i18n-dict";

// Lets server components render an i18n string that follows the user's language.
export function T({ k }: { k: keyof typeof DICT }) {
  const { t } = useI18n();
  return <>{t(k)}</>;
}
