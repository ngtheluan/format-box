"use client";

import { Button, Modal, Progress } from "@/components/ui";
import { useDykStamps } from "@/lib/dyk-stamps";
import { useI18n } from "@/lib/i18n";
import { IconTicket } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { faceFromSaved, Stamp, type StampFace } from "./DykStamp";

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
  const stamps = useDykStamps();

  // Album: tem đang phát hành trước (theo thứ tự hiện vật), rồi tới tem của
  // hiện vật đã gỡ — người xem vẫn giữ thứ họ đã sưu tầm.
  const slots = useMemo(() => {
    const bySlug = new Map(stamps.map((s) => [s.slug, s]));
    const live = (catalog ?? []).map((face) => ({ face, saved: bySlug.get(face.slug) ?? null }));
    const known = new Set(live.map((s) => s.face.slug));
    const retired = stamps.filter((s) => !known.has(s.slug)).map((s) => ({ face: faceFromSaved(s), saved: s }));
    return [...live, ...retired];
  }, [catalog, stamps]);

  const total = slots.length;
  const have = slots.filter((s) => s.saved).length;
  const perfect = slots.filter((s) => s.saved && s.saved.total > 0 && s.saved.score >= s.saved.total).length;

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
          <div>
            <h3>{t("blog_dyk_collection")}</h3>
            <p>{t("blog_dyk_collection_hint")}</p>
          </div>
          {total > 0 && (
            <div className="dyk-album-stat">
              <span>
                <b>{have}</b> / {total} {t("blog_dyk_collection_progress")}
                {perfect > 0 && (
                  <>
                    {" "}
                    · <b>{perfect}</b> {t("blog_dyk_collection_perfect")}
                  </>
                )}
              </span>
              <Progress value={have} max={total} aria-label={t("blog_dyk_collection_progress")} />
            </div>
          )}
        </header>
        {total === 0 ? (
          <p className="dyk-collection-empty">{t("blog_dyk_collection_empty")}</p>
        ) : (
          <ul className="dyk-album">
            {slots.map(({ face, saved }) => (
              <li key={face.slug}>
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
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
