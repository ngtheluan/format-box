"use client";

import { useDykStamps } from "@/lib/dyk-stamps";
import { useI18n } from "@/lib/i18n";
import { IconArchive, IconRosette, IconStarFilled } from "@tabler/icons-react";
import { useMemo } from "react";

// Dải stats dưới header Bảo tàng tri thức — đọc tem từ localStorage nên phải là client.
export function KnowledgeStats({ exhibitSlugs }: { exhibitSlugs: string[] }) {
  const { t } = useI18n();
  const stamps = useDykStamps();

  const stats = useMemo(() => {
    const valid = new Set(exhibitSlugs);
    const owned = stamps.filter((s) => valid.has(s.slug));
    const perfect = owned.filter((s) => s.total > 0 && s.score >= s.total).length;
    return { total: exhibitSlugs.length, owned: owned.length, perfect };
  }, [exhibitSlugs, stamps]);

  const pct = stats.total > 0 ? Math.round((stats.owned / stats.total) * 100) : 0;

  return (
    <div className="bz-knowledge-stats" aria-label={t("blog_dyk_collection_progress")}>
      <div className="bz-knowledge-stat">
        <span className="bz-knowledge-stat-ic" aria-hidden="true">
          <IconArchive size={16} stroke={1.9} />
        </span>
        <span className="bz-knowledge-stat-num">{stats.total}</span>
        <span className="bz-knowledge-stat-label">{t("blog_dyk_knowledge_stat_exhibits")}</span>
      </div>
      <div className="bz-knowledge-stat">
        <span className="bz-knowledge-stat-ic is-ok" aria-hidden="true">
          <IconRosette size={16} stroke={1.9} />
        </span>
        <span className="bz-knowledge-stat-num">{stats.owned}</span>
        <span className="bz-knowledge-stat-label">{t("blog_dyk_knowledge_stat_collected")}</span>
      </div>
      <div className="bz-knowledge-stat">
        <span className="bz-knowledge-stat-ic is-gold" aria-hidden="true">
          <IconStarFilled size={14} />
        </span>
        <span className="bz-knowledge-stat-num">{stats.perfect}</span>
        <span className="bz-knowledge-stat-label">{t("blog_dyk_knowledge_stat_perfect")}</span>
      </div>
      <div className="bz-knowledge-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <i style={{ width: `${pct}%` }} />
        <span>{pct}%</span>
      </div>
    </div>
  );
}
