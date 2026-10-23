"use client";

import { Modal } from "@/components/ui";
import type { DidYouKnowItem as DbDidYouKnowItem } from "@/lib/blog";
import { useI18n } from "@/lib/i18n";
import { IconArrowRight, IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DidYouKnowItem = {
  slug: string;
  title: { vi: string; en: string };
  intro: { vi: string; en: string };
  tag: { vi: string; en: string };
  images: { url: string; caption: { vi: string; en: string } }[];
};

function fromDb(items: DbDidYouKnowItem[]): DidYouKnowItem[] {
  return items.map((it) => ({
    slug: it.slug,
    tag: { vi: it.tag_vi || "", en: it.tag_en || it.tag_vi || "" },
    title: { vi: it.title_vi, en: it.title_en || it.title_vi },
    intro: { vi: it.intro_vi || "", en: it.intro_en || it.intro_vi || "" },
    images: (it.images || []).map((im) => ({
      url: im.url,
      caption: { vi: im.caption_vi || "", en: im.caption_en || im.caption_vi || "" },
    })),
  }));
}

const DYK_PAGE = 9;

export function DidYouKnow({ items }: { items?: DbDidYouKnowItem[] } = {}) {
  const { t, lang } = useI18n();
  const list: DidYouKnowItem[] = items && items.length ? fromDb(items) : [];
  const [active, setActive] = useState<DidYouKnowItem | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [limit, setLimit] = useState(DYK_PAGE);
  const shown = list.slice(0, limit);

  const tr = useCallback(
    (v: { vi: string; en: string }) => (lang === "en" ? v.en : v.vi),
    [lang],
  );

  const close = useCallback(() => {
    setLightbox(null);
    setActive(null);
  }, []);

  const next = useCallback(() => {
    if (active == null || lightbox == null) return;
    setLightbox((i) => (i == null ? 0 : (i + 1) % active.images.length));
  }, [active, lightbox]);

  const prev = useCallback(() => {
    if (active == null || lightbox == null) return;
    setLightbox((i) => (i == null ? 0 : (i - 1 + active.images.length) % active.images.length));
  }, [active, lightbox]);

  useEffect(() => {
    if (lightbox == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, next, prev]);

  if (list.length === 0) return null;

  return (
    <section className="bz-sec dyk-sec" aria-labelledby="dyk-h2">
      <header className="bz-sec-head">
        <h2 id="dyk-h2">{t("blog_dyk_title")}</h2>
        <span className="dyk-sub">{t("blog_dyk_sub")}</span>
      </header>

      <div className="dyk-grid">
        {shown.map((it) => (
          <button
            key={it.slug}
            type="button"
            className="dyk-card"
            onClick={() => {
              setActive(it);
              setLightbox(null);
            }}
          >
            <span className="dyk-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.images[0].url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
              <span className="dyk-count">{it.images.length}</span>
            </span>
            <span className="dyk-body">
              <span className="dyk-tag">{tr(it.tag)}</span>
              <span className="dyk-title">{tr(it.title)}</span>
              <span className="dyk-intro">{tr(it.intro)}</span>
              <span className="dyk-cta">
                {t("blog_dyk_open")} <IconArrowRight size={14} stroke={2} />
              </span>
            </span>
          </button>
        ))}
      </div>

      {list.length > shown.length && (
        <div className="bz-more">
          <button type="button" className="bz-btn" onClick={() => setLimit((n) => n + DYK_PAGE)}>
            {t("blog_load_more")} <IconArrowRight size={14} stroke={2} />
          </button>
        </div>
      )}

      <Modal
        open={active != null}
        onClose={close}
        size="xl"
        closeOnEsc={lightbox == null}
        closeOnOverlay={lightbox == null}
        title={active ? tr(active.title) : null}
        description={active ? tr(active.intro) : null}
      >
        {active && (
          <div className="dyk-gallery">
            {active.images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                className="dyk-gal-item"
                onClick={() => setLightbox(i)}
                aria-label={tr(img.caption)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={tr(img.caption)} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                <span className="dyk-gal-cap">{tr(img.caption)}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {active &&
        lightbox != null &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="dyk-lightbox"
            role="dialog"
            aria-modal="true"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              className="dyk-lb-btn dyk-lb-close"
              aria-label={t("blog_dyk_close")}
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
            >
              <IconX size={20} stroke={2} />
            </button>
            <button
              type="button"
              className="dyk-lb-btn dyk-lb-prev"
              aria-label={t("blog_dyk_prev")}
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
            >
              <IconChevronLeft size={28} stroke={2} />
            </button>
            <figure className="dyk-lb-figure" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.images[lightbox].url}
                alt={tr(active.images[lightbox].caption)}
                referrerPolicy="no-referrer"
              />
              <figcaption>
                <span>{tr(active.images[lightbox].caption)}</span>
                <span className="dyk-lb-count">
                  {lightbox + 1} / {active.images.length}
                </span>
              </figcaption>
            </figure>
            <button
              type="button"
              className="dyk-lb-btn dyk-lb-next"
              aria-label={t("blog_dyk_next")}
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
            >
              <IconChevronRight size={28} stroke={2} />
            </button>
          </div>,
          document.body,
        )}
    </section>
  );
}
