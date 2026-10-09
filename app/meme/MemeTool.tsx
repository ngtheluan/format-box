"use client";
import {
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconFlame,
  IconMessageCircle,
  IconMoodEmpty,
  IconPhoto,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";

type Meme = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  width: number | null;
  height: number | null;
  author: string;
  subreddit: string;
  score: number;
  comments: number;
  nsfw: boolean;
  spoiler: boolean;
  isVideo: boolean;
  isGif: boolean;
  permalink: string;
  createdAt: string;
};

type Sort = "hot" | "new" | "top" | "rising";
type TopRange = "hour" | "day" | "week" | "month" | "year" | "all";

const SUBS: { value: string; labelKey: string }[] = [
  { value: "all", labelKey: "meme_sub_all" },
  { value: "memes", labelKey: "meme_sub_memes" },
  { value: "dankmemes", labelKey: "meme_sub_dank" },
  { value: "wholesomememes", labelKey: "meme_sub_wholesome" },
  { value: "me_irl", labelKey: "meme_sub_meirl" },
  { value: "funny", labelKey: "meme_sub_funny" },
  { value: "PhotoshopBattles", labelKey: "meme_sub_photoshop" },
  { value: "ComedyCemetery", labelKey: "meme_sub_cemetery" },
];

function proxyUrl(url: string): string {
  return `/api/memes/image?url=${encodeURIComponent(url)}`;
}

// The user's browser loads image CDNs (i.redd.it, imgur…) directly from their
// own IP — no cloud-IP block applies there. We only use the proxy for
// clipboard/download, which run on the server side and need CORS bypass.
function displayUrl(url: string): string {
  return url;
}

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

function filenameFromUrl(url: string, title: string): string {
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp|mp4)(\?|$)/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
  return `${safe || "meme"}.${ext}`;
}

export default function MemeTool() {
  const toast = useToast();
  const { t, lang } = useI18n();

  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [sub, setSub] = useState("all");
  const [sort, setSort] = useState<Sort>("hot");
  const [topRange, setTopRange] = useState<TopRange>("day");
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Meme | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchMemes = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sub, sort, t: topRange, limit: "40" });
      if (query) params.set("q", query);
      const res = await fetch(`/api/memes?${params.toString()}`, { signal: ctl.signal });
      const data = (await res.json()) as { memes: Meme[]; error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMemes(data.memes || []);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setMemes([]);
    } finally {
      setLoading(false);
    }
  }, [query, sub, sort, topRange]);

  useEffect(() => {
    fetchMemes();
    return () => abortRef.current?.abort();
  }, [fetchMemes]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(q.trim());
  };

  const clearSearch = () => {
    setQ("");
    setQuery("");
  };

  const copyImage = async (m: Meme) => {
    try {
      const res = await fetch(proxyUrl(m.url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let blob = await res.blob();
      // The Clipboard API only guarantees PNG. Re-encode anything else via canvas.
      if (blob.type !== "image/png") {
        blob = await toPngBlob(blob);
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast(t("meme_toast_copied"));
    } catch {
      try {
        await navigator.clipboard.writeText(m.url);
        toast(t("meme_toast_copied_link"));
      } catch {
        toast(t("meme_toast_copy_failed"));
      }
    }
  };

  const copyLink = async (m: Meme) => {
    try {
      await navigator.clipboard.writeText(m.url);
      toast(t("meme_toast_copied_link"));
    } catch {
      toast(t("meme_toast_copy_failed"));
    }
  };

  const download = async (m: Meme) => {
    try {
      const res = await fetch(proxyUrl(m.url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filenameFromUrl(m.url, m.title);
      a.click();
      URL.revokeObjectURL(href);
      toast(t("toast_download_ok"));
    } catch {
      toast(t("meme_toast_download_failed"));
    }
  };

  const sortOptions = useMemo(
    () => [
      { value: "hot", label: t("meme_sort_hot") },
      { value: "new", label: t("meme_sort_new") },
      { value: "top", label: t("meme_sort_top") },
      { value: "rising", label: t("meme_sort_rising") },
    ],
    [t],
  );

  const topOptions = useMemo(
    () => [
      { value: "hour", label: t("meme_t_hour") },
      { value: "day", label: t("meme_t_day") },
      { value: "week", label: t("meme_t_week") },
      { value: "month", label: t("meme_t_month") },
      { value: "year", label: t("meme_t_year") },
      { value: "all", label: t("meme_t_all") },
    ],
    [t],
  );

  const subOptions = useMemo(
    () => SUBS.map((s) => ({ value: s.value, label: t(s.labelKey as never) })),
    [t],
  );

  const timeAgo = (iso: string): string => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return lang === "vi" ? "vừa xong" : "just now";
    if (m < 60) return `${m}${lang === "vi" ? " phút" : "m"}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}${lang === "vi" ? " giờ" : "h"}`;
    const d = Math.floor(h / 24);
    return `${d}${lang === "vi" ? " ngày" : "d"}`;
  };

  // Esc closes the lightbox.
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [preview]);

  const skeletonHeights = useMemo(
    () => Array.from({ length: 14 }, (_, i) => 180 + ((i * 73) % 180)),
    [],
  );

  return (
    <div className="meme-tool">
      {/* Topbar */}
      <div className="meme-topbar">
        <form className="meme-search" onSubmit={onSearch}>
          <IconSearch size={16} stroke={1.9} className="meme-search-icon" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("meme_search_ph")}
            className="meme-search-input"
            spellCheck={false}
          />
          {q && (
            <button
              type="button"
              className="meme-search-clear"
              onClick={clearSearch}
              aria-label="clear"
            >
              <IconX size={14} stroke={2} />
            </button>
          )}
        </form>

        <div className="meme-filters">
          <div className="meme-select">
            <select
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              aria-label="subreddit"
            >
              {subOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="meme-chips" role="tablist">
            {sortOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                role="tab"
                aria-selected={sort === o.value}
                className={`meme-chip ${sort === o.value ? "is-active" : ""}`}
                onClick={() => setSort(o.value as Sort)}
              >
                {o.label}
              </button>
            ))}
          </div>

          {sort === "top" && (
            <div className="meme-select">
              <select
                value={topRange}
                onChange={(e) => setTopRange(e.target.value as TopRange)}
                aria-label="time range"
              >
                {topOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="meme-icon-btn"
            onClick={fetchMemes}
            disabled={loading}
            aria-label={t("meme_refresh")}
            title={t("meme_refresh")}
          >
            <IconRefresh size={16} stroke={2} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {query && (
        <div className="meme-query-info">
          <IconSearch size={13} stroke={2} />
          <span>
            {t("meme_results_for")} <strong>&quot;{query}&quot;</strong>
          </span>
          <button type="button" className="meme-chip meme-chip-ghost" onClick={clearSearch}>
            <IconX size={12} stroke={2} />
            {t("act_clear")}
          </button>
        </div>
      )}

      {error && (
        <div className="meme-error">
          <IconMoodEmpty size={16} stroke={1.8} />
          <span>
            {t("meme_error")}: {error}
          </span>
        </div>
      )}

      {/* Grid */}
      {loading && memes.length === 0 ? (
        <div className="meme-masonry">
          {skeletonHeights.map((h, i) => (
            <div key={i} className="meme-skeleton" style={{ height: h }} />
          ))}
        </div>
      ) : memes.length === 0 ? (
        <div className="meme-empty">
          <IconPhoto size={32} stroke={1.4} />
          <div>{t("meme_empty")}</div>
        </div>
      ) : (
        <div className="meme-masonry">
          {memes.map((m) => (
            <article key={m.id} className="meme-card">
              <button
                type="button"
                className="meme-thumb-btn"
                onClick={() => setPreview(m)}
                aria-label={m.title}
              >
                {m.isVideo ? (
                  <div className="meme-video-ph">
                    <IconPhoto size={24} stroke={1.6} />
                    <span>{t("meme_video")}</span>
                  </div>
                ) : (
                  <img
                    src={displayUrl(m.thumbnail || m.url)}
                    alt={m.title}
                    loading="lazy"
                    className="meme-thumb"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (
                        el.dataset.step !== "full" &&
                        m.url &&
                        el.src !== displayUrl(m.url)
                      ) {
                        el.dataset.step = "full";
                        el.src = displayUrl(m.url);
                      } else if (el.dataset.step !== "proxy") {
                        el.dataset.step = "proxy";
                        el.src = proxyUrl(m.url);
                      }
                    }}
                  />
                )}
              </button>

              {/* Top-left: subreddit pill (always visible, subtle) */}
              <div className="meme-pill meme-pill-sub">r/{m.subreddit}</div>
              {m.isGif && <div className="meme-pill meme-pill-gif">GIF</div>}

              {/* Hover overlay */}
              <div className="meme-overlay-grad" aria-hidden="true" />

              {/* Floating action buttons (top-right) */}
              <div className="meme-float-actions">
                <button
                  type="button"
                  className="meme-fab"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyImage(m);
                  }}
                  title={t("meme_copy_img")}
                  aria-label={t("meme_copy_img")}
                >
                  <IconCopy size={15} stroke={1.9} />
                </button>
                <button
                  type="button"
                  className="meme-fab"
                  onClick={(e) => {
                    e.stopPropagation();
                    download(m);
                  }}
                  title={t("meme_download")}
                  aria-label={t("meme_download")}
                >
                  <IconDownload size={15} stroke={1.9} />
                </button>
                <a
                  className="meme-fab"
                  href={m.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={t("meme_source")}
                  aria-label={t("meme_source")}
                >
                  <IconExternalLink size={15} stroke={1.9} />
                </a>
              </div>

              {/* Bottom caption */}
              <div className="meme-caption">
                <div className="meme-title" title={m.title}>
                  {m.title}
                </div>
                <div className="meme-stats">
                  <span className="meme-stat">
                    <IconFlame size={12} stroke={2} />
                    {compact(m.score)}
                  </span>
                  <span className="meme-stat">
                    <IconMessageCircle size={12} stroke={2} />
                    {compact(m.comments)}
                  </span>
                  {m.createdAt && <span className="meme-time">{timeAgo(m.createdAt)}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div
          className="meme-lb"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal
        >
          <button
            type="button"
            className="meme-lb-close"
            onClick={() => setPreview(null)}
            aria-label="close"
          >
            <IconX size={20} stroke={2} />
          </button>

          <div className="meme-lb-body" onClick={(e) => e.stopPropagation()}>
            <div className="meme-lb-media-wrap">
              {preview.isVideo ? (
                <video
                  src={displayUrl(preview.url)}
                  controls
                  autoPlay
                  playsInline
                  className="meme-lb-media"
                />
              ) : (
                <img
                  src={displayUrl(preview.url)}
                  alt={preview.title}
                  className="meme-lb-media"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (el.dataset.step !== "proxy") {
                      el.dataset.step = "proxy";
                      el.src = proxyUrl(preview.url);
                    }
                  }}
                />
              )}
            </div>
            <div className="meme-lb-info">
              <h3 className="meme-lb-title">{preview.title}</h3>
              <div className="meme-lb-meta">
                <span className="meme-pill meme-pill-sub meme-pill-static">
                  r/{preview.subreddit}
                </span>
                <span className="meme-lb-sub">u/{preview.author}</span>
                <span className="meme-stat">
                  <IconFlame size={13} stroke={2} />
                  {compact(preview.score)}
                </span>
                <span className="meme-stat">
                  <IconMessageCircle size={13} stroke={2} />
                  {compact(preview.comments)}
                </span>
              </div>
              <div className="meme-lb-actions">
                <button
                  type="button"
                  className="meme-btn meme-btn-primary"
                  onClick={() => copyImage(preview)}
                >
                  <IconCopy size={15} stroke={1.9} />
                  {t("meme_copy_img")}
                </button>
                <button
                  type="button"
                  className="meme-btn"
                  onClick={() => copyLink(preview)}
                >
                  <IconCopy size={15} stroke={1.9} />
                  {t("meme_copy_link")}
                </button>
                <button
                  type="button"
                  className="meme-btn"
                  onClick={() => download(preview)}
                >
                  <IconDownload size={15} stroke={1.9} />
                  {t("meme_download")}
                </button>
                <a
                  className="meme-btn"
                  href={preview.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconExternalLink size={15} stroke={1.9} />
                  {t("meme_source")}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="meme-footnote">{t("meme_footnote")}</p>

      <style jsx>{`
        .meme-tool {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* --- Topbar --- */
        .meme-topbar {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .meme-search {
          position: relative;
          display: flex;
          align-items: center;
        }
        .meme-search-icon {
          position: absolute;
          left: 14px;
          opacity: 0.55;
          pointer-events: none;
        }
        .meme-search-input {
          width: 100%;
          padding: 11px 40px 11px 40px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--bg2);
          color: var(--text);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .meme-search-input:hover {
          background: var(--bg);
        }
        .meme-search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 18%, transparent);
          background: var(--bg);
        }
        .meme-search-clear {
          position: absolute;
          right: 10px;
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border: none;
          background: var(--border);
          color: var(--text);
          border-radius: 999px;
          cursor: pointer;
          opacity: 0.75;
          transition: opacity 0.15s;
        }
        .meme-search-clear:hover {
          opacity: 1;
        }
        .meme-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .meme-select {
          position: relative;
        }
        .meme-select::after {
          content: "▾";
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 10px;
          opacity: 0.6;
          pointer-events: none;
        }
        .meme-select select {
          appearance: none;
          -webkit-appearance: none;
          padding: 7px 28px 7px 14px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--bg2);
          color: var(--text);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s, border-color 0.15s;
        }
        .meme-select select:hover {
          background: var(--bg);
          border-color: color-mix(in oklab, var(--accent) 40%, var(--border));
        }
        .meme-chips {
          display: inline-flex;
          padding: 3px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--bg2);
          gap: 2px;
        }
        .meme-chip {
          padding: 5px 12px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: var(--text);
          font-size: 12.5px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          opacity: 0.72;
          transition: opacity 0.15s, background 0.15s, color 0.15s;
        }
        .meme-chip:hover {
          opacity: 1;
          background: var(--bg);
        }
        .meme-chip.is-active {
          background: var(--accent);
          color: var(--on-accent, #fff);
          opacity: 1;
          font-weight: 600;
        }
        .meme-chip-ghost {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border: 1px solid var(--border);
          background: transparent;
          font-size: 11px;
          margin-left: auto;
        }
        .meme-icon-btn {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--bg2);
          color: var(--text);
          cursor: pointer;
          margin-left: auto;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }
        .meme-icon-btn:hover:not(:disabled) {
          background: var(--bg);
          border-color: color-mix(in oklab, var(--accent) 50%, var(--border));
        }
        .meme-icon-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .meme-icon-btn:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* --- Query info / Error --- */
        .meme-query-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg2);
          font-size: 13px;
          opacity: 0.85;
        }
        .meme-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border: 1px solid #ef444455;
          background: color-mix(in oklab, #ef4444 10%, transparent);
          border-radius: 12px;
          color: var(--text);
          font-size: 13px;
        }

        /* --- Masonry --- */
        .meme-masonry {
          column-count: 4;
          column-gap: 12px;
        }
        .meme-skeleton {
          border-radius: 14px;
          margin: 0 0 12px;
          break-inside: avoid;
          background: linear-gradient(
            90deg,
            var(--bg2) 0%,
            color-mix(in oklab, var(--bg2) 70%, var(--bg)) 50%,
            var(--bg2) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.4s linear infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        /* --- Card --- */
        .meme-card {
          position: relative;
          margin: 0 0 12px;
          border-radius: 14px;
          overflow: hidden;
          background: var(--bg2);
          break-inside: avoid;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.08),
            0 2px 6px rgba(0, 0, 0, 0.04);
          transition:
            transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
            box-shadow 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .meme-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 4px 12px rgba(0, 0, 0, 0.12),
            0 10px 28px rgba(0, 0, 0, 0.14);
        }
        .meme-thumb-btn {
          display: block;
          width: 100%;
          padding: 0;
          border: none;
          background: var(--bg);
          cursor: zoom-in;
        }
        .meme-thumb {
          width: 100%;
          height: auto;
          display: block;
          background: var(--bg);
        }
        .meme-video-ph {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 48px 20px;
          color: var(--text);
          opacity: 0.7;
          font-size: 12px;
        }

        /* --- Pills --- */
        .meme-pill {
          position: absolute;
          z-index: 2;
          padding: 3px 9px;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.2px;
          color: #fff;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          pointer-events: none;
        }
        .meme-pill-sub {
          top: 10px;
          left: 10px;
        }
        .meme-pill-gif {
          top: 10px;
          right: 10px;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
        }
        .meme-pill-static {
          position: static;
          display: inline-flex;
          background: color-mix(in oklab, var(--accent) 85%, transparent);
          backdrop-filter: none;
          pointer-events: auto;
        }

        /* --- Hover overlay + floating actions --- */
        .meme-overlay-grad {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.78) 0%,
            rgba(0, 0, 0, 0.42) 32%,
            rgba(0, 0, 0, 0) 55%
          );
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
          z-index: 1;
        }
        .meme-card:hover .meme-overlay-grad {
          opacity: 1;
        }
        .meme-float-actions {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 6px;
          z-index: 3;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.2s, transform 0.2s;
        }
        .meme-card:hover .meme-float-actions,
        .meme-card:focus-within .meme-float-actions {
          opacity: 1;
          transform: translateY(0);
        }
        /* GIF pill shouldn't sit under the FAB row */
        .meme-card:hover .meme-pill-gif {
          display: none;
        }
        .meme-fab {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          color: #0a0e15;
          cursor: pointer;
          text-decoration: none;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          transition: transform 0.15s, background 0.15s;
        }
        .meme-fab:hover {
          background: #fff;
          transform: scale(1.08);
        }
        .meme-fab:active {
          transform: scale(0.96);
        }

        /* --- Caption (bottom) --- */
        .meme-caption {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 10px 12px 11px;
          color: #fff;
          z-index: 2;
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.2s, transform 0.2s;
          pointer-events: none;
        }
        .meme-card:hover .meme-caption {
          opacity: 1;
          transform: translateY(0);
        }
        .meme-title {
          font-size: 12.5px;
          font-weight: 600;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
          margin-bottom: 4px;
        }
        .meme-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 11px;
          align-items: center;
          opacity: 0.9;
        }
        .meme-stat {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .meme-time {
          margin-left: auto;
          opacity: 0.75;
        }

        /* --- Empty --- */
        .meme-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 64px 24px;
          text-align: center;
          font-size: 14px;
          opacity: 0.6;
          border: 1px dashed var(--border);
          border-radius: 14px;
        }
        .meme-footnote {
          font-size: 11px;
          opacity: 0.5;
          text-align: center;
          margin: 8px 0 0;
        }

        /* --- Lightbox --- */
        .meme-lb {
          position: fixed;
          inset: 0;
          background: rgba(10, 14, 21, 0.86);
          display: grid;
          place-items: center;
          padding: 24px;
          z-index: 1000;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: fadeIn 0.18s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .meme-lb-close {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1001;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 0.15s, transform 0.15s;
        }
        .meme-lb-close:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .meme-lb-body {
          max-width: min(1100px, 100%);
          max-height: calc(100vh - 48px);
          display: flex;
          flex-direction: column;
          gap: 14px;
          animation: slideUp 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .meme-lb-media-wrap {
          display: grid;
          place-items: center;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        }
        .meme-lb-media {
          max-width: 100%;
          max-height: 72vh;
          object-fit: contain;
          display: block;
        }
        .meme-lb-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0 4px;
          color: #fff;
        }
        .meme-lb-title {
          font-size: 16px;
          font-weight: 700;
          line-height: 1.4;
          margin: 0;
        }
        .meme-lb-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          font-size: 12px;
          opacity: 0.85;
        }
        .meme-lb-sub {
          opacity: 0.7;
        }
        .meme-lb-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 2px;
        }
        .meme-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          color: #fff;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          cursor: pointer;
          text-decoration: none;
          backdrop-filter: blur(8px);
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
        }
        .meme-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.22);
        }
        .meme-btn:active {
          transform: scale(0.97);
        }
        .meme-btn-primary {
          background: var(--accent);
          border-color: var(--accent);
          color: var(--on-accent, #fff);
        }
        .meme-btn-primary:hover {
          background: color-mix(in oklab, var(--accent) 85%, white);
          border-color: color-mix(in oklab, var(--accent) 85%, white);
        }

        /* --- Responsive --- */
        @media (min-width: 1400px) {
          .meme-masonry {
            column-count: 5;
          }
        }
        @media (max-width: 1100px) {
          .meme-masonry {
            column-count: 3;
          }
        }
        @media (max-width: 720px) {
          .meme-topbar {
            gap: 8px;
          }
          .meme-search-input {
            font-size: 15px; /* avoids iOS zoom */
            padding: 10px 36px;
          }
          .meme-filters {
            overflow-x: auto;
            flex-wrap: nowrap;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            margin: 0 -4px;
            padding: 0 4px 4px;
          }
          .meme-filters::-webkit-scrollbar {
            display: none;
          }
          .meme-filters > * {
            flex-shrink: 0;
          }
          .meme-icon-btn {
            margin-left: 0;
          }
          .meme-masonry {
            column-count: 2;
            column-gap: 8px;
          }
          .meme-card {
            margin-bottom: 8px;
            border-radius: 12px;
          }
          .meme-skeleton {
            margin-bottom: 8px;
            border-radius: 12px;
          }
          /* On mobile the caption always shows (no hover state). */
          .meme-caption,
          .meme-overlay-grad,
          .meme-float-actions {
            opacity: 1;
            transform: none;
          }
          .meme-float-actions {
            top: 8px;
            right: 8px;
            gap: 4px;
          }
          .meme-fab {
            width: 28px;
            height: 28px;
          }
          .meme-pill-sub {
            top: 8px;
            left: 8px;
            font-size: 10px;
            padding: 2px 7px;
          }
          .meme-title {
            font-size: 11.5px;
          }
          .meme-lb {
            padding: 12px;
          }
          .meme-lb-close {
            top: 10px;
            right: 10px;
          }
          .meme-lb-media {
            max-height: 60vh;
          }
          .meme-lb-title {
            font-size: 14px;
          }
          .meme-btn {
            padding: 7px 11px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}

async function toPngBlob(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas ctx");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png encode failed"))), "image/png");
  });
}
