"use client";

import { Button, Modal } from "@/components/ui";
import { getStamps, type DykStamp } from "@/lib/dyk-stamps";
import { useI18n } from "@/lib/i18n";
import { IconTicket } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { StampCard } from "./DykExhibit";

// Nút + modal bộ sưu tập tem. Dùng ở header DYK trong /blog và ở toolbar
// bài viết /blog/[slug]. Lắng nghe event "fb-dyk-stamps-changed" để luôn
// khớp localStorage, nhiều tab cũng sync qua "storage".
export function StampCollection({
  variant = "section",
}: {
  variant?: "section" | "toolbar";
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [stamps, setStamps] = useState<DykStamp[]>([]);

  useEffect(() => {
    const sync = () => setStamps(getStamps());
    sync();
    window.addEventListener("fb-dyk-stamps-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("fb-dyk-stamps-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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
      >
        <header className="dyk-collection-head">
          <div>
            <h3>
              {t("blog_dyk_collection")}
              {stamps.length > 0 && (
                <small>
                  {" "}
                  — {stamps.length} {t("blog_dyk_collection_count")}
                </small>
              )}
            </h3>
          </div>
        </header>
        {stamps.length === 0 ? (
          <p className="dyk-collection-empty">{t("blog_dyk_collection_empty")}</p>
        ) : (
          <ul className="dyk-collection-grid">
            {stamps.map((s) => (
              <li key={s.slug}>
                <a
                  className="dyk-collection-item"
                  href={`/blog#dyk-${s.slug}`}
                  onClick={() => setOpen(false)}
                  aria-label={t("blog_dyk_collection_view")}
                >
                  <StampCard
                    image={s.image}
                    title={s.title}
                    tag={s.tag}
                    score={s.score}
                    total={s.total}
                    earnedAt={s.earnedAt}
                    lang={lang}
                    perfectLabel={t("blog_dyk_stamp_perfect")}
                    stampLabel={t("blog_dyk_stamp")}
                    size="sm"
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
