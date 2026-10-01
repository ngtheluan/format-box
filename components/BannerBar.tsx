"use client";
import { useEffect, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { useI18n } from "@/lib/i18n";
import {
  bannerCta,
  bannerMessage,
  isBannerLive,
  sortBanners,
  type Banner,
} from "@/lib/banners-shared";

const DISMISS_PREFIX = "fb-banner-dismissed:";

// A banner stays dismissed until its content changes: the key folds in
// updatedAt, so editing/re-enabling a banner re-shows it to everyone.
const dismissKey = (b: Banner) => `${DISMISS_PREFIX}${b.id}:${b.updatedAt}`;

function isDismissed(b: Banner): boolean {
  try {
    return localStorage.getItem(dismissKey(b)) === "1";
  } catch {
    return false;
  }
}

export default function BannerBar() {
  const { lang } = useI18n();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState<Banner | null>(null);

  const pickVisible = (list: Banner[]) => {
    const live = sortBanners(list).filter((b) => isBannerLive(b) && !isDismissed(b));
    setCurrent(live[0] ?? null);
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/banners", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        const list: Banner[] = j.banners ?? [];
        setBanners(list);
        pickVisible(list);
      } catch {
        /* no banners on failure */
      }
    };
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("fb-banners") : null;
    if (bc) bc.onmessage = () => load();
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      bc?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!current) return null;

  const msg = bannerMessage(current, lang);
  const cta = bannerCta(current, lang);

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(current), "1");
    } catch {
      /* best effort */
    }
    pickVisible(banners);
  };

  return (
    <div className="fb-banner" data-tone={current.tone} role="status">
      <div className="fb-banner-inner">
        <span className="fb-banner-msg">{msg}</span>
        {current.href && cta && (
          <a className="fb-banner-cta" href={current.href}>
            {cta}
          </a>
        )}
      </div>
      {current.dismissible && (
        <button className="fb-banner-x" onClick={dismiss} aria-label="Đóng thông báo">
          <IconX size={15} stroke={2.2} />
        </button>
      )}
    </div>
  );
}
