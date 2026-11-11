"use client";

import { ChillMusic } from "@/components/ChillMusic";
import { Button, IconButton, Modal } from "@/components/ui";
import type { DidYouKnowItem as DbDidYouKnowItem } from "@/lib/blog";
import { useI18n } from "@/lib/i18n";
import { IconArrowRight, IconPhoto, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DykExhibit, exhibitNumber, imageCredit, type DykExhibitView } from "./DykExhibit";
import { StampCollection } from "./StampCollection";

function fromDb(items: DbDidYouKnowItem[]): DykExhibitView[] {
  return items.map((it) => ({
    slug: it.slug,
    tag: { vi: it.tag_vi || "", en: it.tag_en || it.tag_vi || "" },
    title: { vi: it.title_vi, en: it.title_en || it.title_vi },
    intro: { vi: it.intro_vi || "", en: it.intro_en || it.intro_vi || "" },
    images: (it.images || []).map((im) => ({
      url: im.url,
      caption: { vi: im.caption_vi || "", en: im.caption_en || im.caption_vi || "" },
      credit: imageCredit(im),
    })),
    quiz: (it.quiz || []).map((q) => ({
      question: { vi: q.q_vi, en: q.q_en || q.q_vi },
      options: q.options_vi.map((vi, i) => ({ vi, en: q.options_en[i] || vi })),
      answer: q.answer,
      explain: { vi: q.explain_vi, en: q.explain_en || q.explain_vi },
    })),
  }));
}

const DYK_PAGE = 8;

export function DidYouKnow({ items }: { items?: DbDidYouKnowItem[] } = {}) {
  const { t, lang } = useI18n();
  const list = useMemo(() => (items && items.length ? fromDb(items) : []), [items]);
  const [active, setActive] = useState<number | null>(null);
  const [limit, setLimit] = useState(DYK_PAGE);
  const close = useCallback(() => setActive(null), []);

  // Hash "#dyk-<slug>" từ nút Bộ sưu tập ở các trang khác → mở đúng hiện vật
  // ngay khi vào /blog. Bỏ hash khỏi URL để không giữ trạng thái stale.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const open = () => {
      const h = window.location.hash;
      if (!h.startsWith("#dyk-")) return;
      const slug = decodeURIComponent(h.slice(5));
      const idx = list.findIndex((it) => it.slug === slug);
      if (idx >= 0) setActive(idx);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [list]);

  if (list.length === 0) return null;

  const shown = list.slice(0, limit);
  const current = active != null ? list[active] : null;

  return (
    <section className="bz-sec dyk-sec" aria-labelledby="dyk-h2">
      <header className="bz-sec-head">
        <div>
          <h2 id="dyk-h2">
            {t("blog_dyk_title")} ({list.length})
          </h2>
          <p className="bz-series-sub">{t("blog_dyk_tagline")}</p>
        </div>
        <StampCollection />
      </header>

      <div className="dyk-grid">
        {shown.map((it, i) => {
          const tag = lang === "en" ? it.tag.en : it.tag.vi;
          return (
            <Button key={it.slug} variant="ghost" className="dyk-card" onClick={() => setActive(i)}>
              <span className="dyk-frame">
                <span className="dyk-mat">
                  {it.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.images[0].url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                  ) : (
                    <IconPhoto size={28} stroke={1.4} />
                  )}
                </span>
                <span className="dyk-beam" aria-hidden="true" />
                {it.images[0]?.credit && (
                  <span className="dyk-credit">
                    {t("blog_photo")}: {it.images[0].credit.label}
                  </span>
                )}
              </span>
              <span className="dyk-plaque">
                <span className="dyk-no">
                  {t("blog_dyk_exhibit")} {exhibitNumber(i)}
                  {tag && ` · ${tag}`}
                </span>
                <span className="dyk-title">{lang === "en" ? it.title.en : it.title.vi}</span>
                <span className="dyk-cta">
                  {t("blog_dyk_step_in")} <IconArrowRight size={13} stroke={2} />
                </span>
              </span>
            </Button>
          );
        })}
      </div>

      {list.length > shown.length && (
        <div className="bz-more">
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<IconArrowRight size={14} stroke={2} />}
            onClick={() => setLimit((n) => n + DYK_PAGE)}
          >
            {t("blog_load_more")}
          </Button>
        </div>
      )}

      <Modal
        open={current != null}
        onClose={close}
        hideClose
        ariaLabel={current ? (lang === "en" ? current.title.en : current.title.vi) : undefined}
        className="mu-room"
      >
        {current && active != null && (
          <div className="mu-shell">
            {/* Lives outside the keyed exhibit so the music carries on between exhibits. */}
            <header className="mu-top">
              <span className="mu-loc">
                <b>
                  {t("blog_dyk_exhibit")} {exhibitNumber(active)}
                </b>
                {(lang === "en" ? current.tag.en : current.tag.vi) && (
                  <i>{lang === "en" ? current.tag.en : current.tag.vi}</i>
                )}
                <span>{lang === "en" ? current.title.en : current.title.vi}</span>
              </span>
              <span className="mu-top-acts">
                <ChillMusic />
                <IconButton size="sm" aria-label={t("blog_dyk_close")} onClick={close}>
                  <IconX size={16} stroke={2} />
                </IconButton>
              </span>
            </header>
            <DykExhibit
              key={current.slug}
              item={current}
              onClose={close}
              onNext={active + 1 < list.length ? () => setActive(active + 1) : undefined}
            />
          </div>
        )}
      </Modal>
    </section>
  );
}
