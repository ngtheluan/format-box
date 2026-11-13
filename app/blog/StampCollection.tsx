"use client";

import { Button, Modal, Progress } from "@/components/ui";
import { useDykStamps } from "@/lib/dyk-stamps";
import { useI18n } from "@/lib/i18n";
import { IconLock, IconMoodEmpty, IconRosette, IconStarFilled, IconTicket } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Stamp, type StampFace } from "./DykStamp";

type Filter = "all" | "owned" | "locked";

// Nút + album tem. Dùng ở header Bảo tàng trong /blog (có `catalog` → hiện cả ô
// tem chưa sưu tầm) và ở toolbar bài viết /blog/[slug] (chỉ tem đã có).
export function StampCollection({
  variant = "section",
  catalog,
}: {
  variant?: "section" | "toolbar";
  // Mọi con tem đang phát hành, theo thứ tự hiện vật.
  catalog?: StampFace[];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const stamps = useDykStamps();

  // Album chỉ gồm hiện vật đang phát hành — hiện vật admin đã gỡ thì tem cũng
  // biến mất khỏi bảo tàng (dọn ở DidYouKnow bằng pruneStamps).
  const slots = useMemo(() => {
    const bySlug = new Map(stamps.map((s) => [s.slug, s]));
    return (catalog ?? []).map((face) => ({ face, saved: bySlug.get(face.slug) ?? null }));
  }, [catalog, stamps]);

  const total = slots.length;
  const have = slots.filter((s) => s.saved).length;
  const perfect = slots.filter((s) => s.saved && s.saved.total > 0 && s.saved.score >= s.saved.total).length;
  const locked = total - have;

  const filtered = useMemo(() => {
    if (filter === "owned") return slots.filter((s) => s.saved);
    if (filter === "locked") return slots.filter((s) => !s.saved);
    return slots;
  }, [filter, slots]);

  const button =
    variant === "toolbar" ? (
      <button
        type="button"
        className="bd-tools-btn"
        onClick={() => setOpen(true)}
        aria-label={t("blog_dyk_collection")}
        title={`${t("blog_dyk_collection")}${stamps.length ? ` (${stamps.length})` : ""}`}
      >
        <IconTicket size={14} stroke={1.8} />
        {stamps.length > 0 && <span className="bd-tools-badge">{stamps.length}</span>}
      </button>
    ) : (
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<IconTicket size={14} stroke={1.8} />}
        onClick={() => setOpen(true)}
        className="dyk-collection-btn"
      >
        {t("blog_dyk_collection")}
        {stamps.length > 0 && <span className="dyk-collection-count">{stamps.length}</span>}
      </Button>
    );

  const pct = total > 0 ? Math.round((have / total) * 100) : 0;

  return (
    <>
      {button}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel={t("blog_dyk_collection")}
        className="dyk-collection-modal"
        size="xl"
      >
        <header className="dyk-album-head">
          <div className="dyk-album-intro">
            <span className="dyk-album-eyebrow">
              <IconTicket size={13} stroke={2} />
              {t("blog_dyk_title")}
            </span>
            <h3>{t("blog_dyk_collection")}</h3>
            <p>{t("blog_dyk_collection_hint")}</p>
          </div>
          {total > 0 && (
            <div className="dyk-album-stat">
              <ProgressRing value={have} max={total} />
              <div className="dyk-album-stat-grid">
                <span className="dyk-album-stat-cell">
                  <IconRosette size={14} stroke={2} />
                  <b>{have}</b>
                  <i>/ {total}</i>
                  <em>{t("blog_dyk_collection_progress")}</em>
                </span>
                <span className="dyk-album-stat-cell">
                  <IconStarFilled size={13} />
                  <b>{perfect}</b>
                  <em>{t("blog_dyk_collection_perfect")}</em>
                </span>
              </div>
              <Progress value={have} max={total} aria-label={t("blog_dyk_collection_progress")} />
            </div>
          )}
        </header>

        {total > 0 && (
          <div className="dyk-album-tabs" role="tablist" aria-label={t("blog_dyk_collection")}>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "all"}
              className={`dyk-album-tab${filter === "all" ? " is-on" : ""}`}
              onClick={() => setFilter("all")}
            >
              {t("blog_dyk_filter_all")}
              <span>{total}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "owned"}
              className={`dyk-album-tab${filter === "owned" ? " is-on" : ""}`}
              onClick={() => setFilter("owned")}
            >
              {t("blog_dyk_filter_owned")}
              <span>{have}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "locked"}
              className={`dyk-album-tab${filter === "locked" ? " is-on" : ""}`}
              onClick={() => setFilter("locked")}
            >
              {t("blog_dyk_filter_locked")}
              <span>{locked}</span>
            </button>
            <span className="dyk-album-tab-pct" aria-hidden="true">
              {pct}%
            </span>
          </div>
        )}

        {total === 0 ? (
          <div className="dyk-collection-empty">
            <span className="dyk-collection-empty-ic" aria-hidden="true">
              <IconMoodEmpty size={28} stroke={1.6} />
            </span>
            <p>{t("blog_dyk_collection_empty")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="dyk-collection-empty">
            <span className="dyk-collection-empty-ic" aria-hidden="true">
              {filter === "owned" ? <IconRosette size={28} stroke={1.6} /> : <IconLock size={26} stroke={1.6} />}
            </span>
            <p>
              {filter === "owned"
                ? t("blog_dyk_collection_empty")
                : t("blog_dyk_collection_hint")}
            </p>
          </div>
        ) : (
          <ul className="dyk-album">
            {filtered.map(({ face, saved }) => {
              const isPerfect = !!saved && saved.total > 0 && saved.score >= saved.total;
              return (
                <li key={face.slug} className={`dyk-album-slot${saved ? " is-owned" : ""}${isPerfect ? " is-perfect" : ""}`}>
                  <a
                    className={`dyk-album-item${saved ? "" : " is-empty"}`}
                    href={`/blog#dyk-${face.slug}`}
                    onClick={() => setOpen(false)}
                    title={t("blog_dyk_collection_view")}
                  >
                    <Stamp
                      face={face}
                      size="sm"
                      locked={!saved}
                      earned={saved ? { score: saved.score, total: saved.total, at: saved.earnedAt } : null}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}

// Vòng tiến độ — hiển thị tỷ lệ tem đã sưu tầm bằng một ring SVG, chữ % ở giữa.
function ProgressRing({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <svg className="dyk-ring" viewBox="0 0 72 72" aria-hidden="true">
      <circle className="dyk-ring-bg" cx="36" cy="36" r={r} />
      <circle
        className="dyk-ring-fg"
        cx="36"
        cy="36"
        r={r}
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" className="dyk-ring-text">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
