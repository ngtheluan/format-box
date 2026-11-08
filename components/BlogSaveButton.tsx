"use client";

import { IconButton } from "@/components/ui";
import { toggleSavedPost, useSavedSlugs } from "@/lib/blog-saved";
import { useI18n } from "@/lib/i18n";
import { IconBookmark, IconBookmarkFilled } from "@tabler/icons-react";

export function BlogSaveButton({ slug }: { slug: string }) {
  const { t } = useI18n();
  const saved = useSavedSlugs().includes(slug);
  const label = saved ? t("blog_unsave") : t("blog_save");
  return (
    <IconButton
      size="sm"
      round
      className={`bzc-save${saved ? " is-on" : ""}`}
      aria-label={label}
      aria-pressed={saved}
      title={label}
      onClick={() => toggleSavedPost(slug)}
    >
      {saved ? <IconBookmarkFilled size={14} /> : <IconBookmark size={14} stroke={2} />}
    </IconButton>
  );
}
