"use client";
import {
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconFlame,
  IconMessageCircle,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { Button, Input, Select } from "@/components/ui";
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
  { value: "memesVN", labelKey: "meme_sub_vn" },
  { value: "PhotoshopBattles", labelKey: "meme_sub_photoshop" },
  { value: "ComedyCemetery", labelKey: "meme_sub_cemetery" },
];

function proxyUrl(url: string): string {
  return `/api/memes/image?url=${encodeURIComponent(url)}`;
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

  return (
    <div className="meme-tool">
      <form className="meme-controls" onSubmit={onSearch}>
        <div className="meme-search">
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
            <button type="button" className="meme-search-clear" onClick={clearSearch} aria-label="clear">
              <IconX size={14} stroke={2} />
            </button>
          )}
        </div>
        <Select
          options={subOptions}
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          selectSize="sm"
        />
        <Select
          options={sortOptions}
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          selectSize="sm"
        />
        {sort === "top" && (
          <Select
            options={topOptions}
            value={topRange}
            onChange={(e) => setTopRange(e.target.value as TopRange)}
            selectSize="sm"
          />
        )}
        <Button
          size="sm"
          type="button"
          variant="subtle"
          onClick={fetchMemes}
          disabled={loading}
          leftIcon={<IconRefresh size={14} stroke={1.9} />}
        >
          {t("meme_refresh")}
        </Button>
      </form>

      {query && (
        <div className="meme-query-info">
          {t("meme_results_for")} <strong>&quot;{query}&quot;</strong>
        </div>
      )}

      {error && (
        <div className="meme-error">
          {t("meme_error")}: {error}
        </div>
      )}

      {loading && memes.length === 0 ? (
        <div className="meme-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="meme-skeleton" />
          ))}
        </div>
      ) : memes.length === 0 ? (
        <div className="meme-empty">{t("meme_empty")}</div>
      ) : (
        <div className="meme-grid">
          {memes.map((m) => (
            <article key={m.id} className="meme-card">
              <button type="button" className="meme-thumb-btn" onClick={() => setPreview(m)}>
                {m.isVideo ? (
                  <div className="meme-video-placeholder">
                    <span>{t("meme_video")}</span>
                  </div>
                ) : (
                  <img
                    src={proxyUrl(m.thumbnail || m.url)}
                    alt={m.title}
                    loading="lazy"
                    className="meme-thumb"
                  />
                )}
                {m.isGif && <span className="meme-badge-gif">GIF</span>}
              </button>
              <div className="meme-meta">
                <div className="meme-title" title={m.title}>
                  {m.title}
                </div>
                <div className="meme-stats">
                  <span className="meme-sub">r/{m.subreddit}</span>
                  <span className="meme-stat">
                    <IconFlame size={12} stroke={2} />
                    {compact(m.score)}
                  </span>
                  <span className="meme-stat">
                    <IconMessageCircle size={12} stroke={2} />
                    {compact(m.comments)}
                  </span>
                  <span className="meme-time">{timeAgo(m.createdAt)}</span>
                </div>
                <div className="meme-actions">
                  <button
                    type="button"
                    className="meme-action"
                    onClick={() => copyImage(m)}
                    title={t("meme_copy_img")}
                  >
                    <IconCopy size={14} stroke={1.9} />
                    <span>{t("meme_copy_img")}</span>
                  </button>
                  <button
                    type="button"
                    className="meme-action"
                    onClick={() => download(m)}
                    title={t("meme_download")}
                  >
                    <IconDownload size={14} stroke={1.9} />
                    <span>{t("meme_download")}</span>
                  </button>
                  <a
                    className="meme-action"
                    href={m.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("meme_source")}
                  >
                    <IconExternalLink size={14} stroke={1.9} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {preview && (
        <div className="meme-overlay" onClick={() => setPreview(null)} role="dialog" aria-modal>
          <div className="meme-overlay-body" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="meme-overlay-close"
              onClick={() => setPreview(null)}
              aria-label="close"
            >
              <IconX size={18} stroke={2} />
            </button>
            {preview.isVideo ? (
              <video
                src={proxyUrl(preview.url)}
                controls
                autoPlay
                playsInline
                className="meme-overlay-media"
              />
            ) : (
              <img src={proxyUrl(preview.url)} alt={preview.title} className="meme-overlay-media" />
            )}
            <div className="meme-overlay-info">
              <h3 className="meme-overlay-title">{preview.title}</h3>
              <div className="meme-stats">
                <span className="meme-sub">r/{preview.subreddit}</span>
                <span>u/{preview.author}</span>
                <span className="meme-stat">
                  <IconFlame size={12} stroke={2} />
                  {compact(preview.score)}
                </span>
                <span className="meme-stat">
                  <IconMessageCircle size={12} stroke={2} />
                  {compact(preview.comments)}
                </span>
              </div>
              <div className="meme-actions">
                <Button
                  size="sm"
                  onClick={() => copyImage(preview)}
                  leftIcon={<IconCopy size={14} stroke={1.9} />}
                >
                  {t("meme_copy_img")}
                </Button>
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => copyLink(preview)}
                  leftIcon={<IconCopy size={14} stroke={1.9} />}
                >
                  {t("meme_copy_link")}
                </Button>
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => download(preview)}
                  leftIcon={<IconDownload size={14} stroke={1.9} />}
                >
                  {t("meme_download")}
                </Button>
                <a
                  className="meme-action meme-action-strong"
                  href={preview.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconExternalLink size={14} stroke={1.9} />
                  <span>{t("meme_source")}</span>
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
          gap: 16px;
        }
        .meme-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .meme-search {
          position: relative;
          flex: 1 1 240px;
          min-width: 220px;
          display: flex;
          align-items: center;
        }
        .meme-search-icon {
          position: absolute;
          left: 10px;
          opacity: 0.6;
          pointer-events: none;
        }
        .meme-search-input {
          width: 100%;
          padding: 8px 32px 8px 32px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg2);
          color: var(--text);
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
        }
        .meme-search-input:focus {
          border-color: var(--accent);
        }
        .meme-search-clear {
          position: absolute;
          right: 8px;
          display: grid;
          place-items: center;
          width: 20px;
          height: 20px;
          border: none;
          background: var(--bg3, var(--bg));
          color: var(--text);
          border-radius: 999px;
          cursor: pointer;
          opacity: 0.7;
        }
        .meme-search-clear:hover {
          opacity: 1;
        }
        .meme-query-info {
          font-size: 13px;
          opacity: 0.75;
        }
        .meme-error {
          padding: 10px 12px;
          border: 1px solid #ef4444aa;
          background: #ef444422;
          border-radius: 10px;
          color: var(--text);
          font-size: 13px;
        }
        .meme-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
        }
        .meme-skeleton {
          height: 240px;
          border-radius: 12px;
          background: linear-gradient(90deg, var(--bg2) 0%, var(--bg) 50%, var(--bg2) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.4s linear infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .meme-card {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
          background: var(--bg2);
          border-radius: 12px;
          overflow: hidden;
          transition: transform 0.15s, border-color 0.15s;
        }
        .meme-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent);
        }
        .meme-thumb-btn {
          position: relative;
          display: block;
          border: none;
          padding: 0;
          background: var(--bg);
          cursor: zoom-in;
          aspect-ratio: 1 / 1;
          overflow: hidden;
        }
        .meme-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .meme-video-placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          font-size: 13px;
          opacity: 0.7;
          background: var(--bg);
        }
        .meme-badge-gif {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.72);
          color: #fff;
          border-radius: 4px;
          letter-spacing: 0.3px;
        }
        .meme-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px 12px;
        }
        .meme-title {
          font-size: 13px;
          font-weight: 600;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .meme-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 11px;
          opacity: 0.7;
          align-items: center;
        }
        .meme-sub {
          color: var(--accent);
          font-weight: 600;
        }
        .meme-stat {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .meme-time {
          margin-left: auto;
        }
        .meme-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }
        .meme-action {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 7px;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
        }
        .meme-action:hover {
          background: var(--bg2);
          border-color: var(--accent);
        }
        .meme-action-strong {
          background: var(--accent);
          color: var(--on-accent, #fff);
          border-color: var(--accent);
        }
        .meme-empty {
          padding: 48px 24px;
          text-align: center;
          font-size: 13px;
          opacity: 0.7;
          border: 1px dashed var(--border);
          border-radius: 12px;
        }
        .meme-footnote {
          font-size: 11px;
          opacity: 0.55;
          text-align: center;
          margin: 12px 0 0;
        }
        .meme-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          display: grid;
          place-items: center;
          padding: 24px;
          z-index: 1000;
          backdrop-filter: blur(6px);
        }
        .meme-overlay-body {
          position: relative;
          max-width: min(960px, 100%);
          max-height: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
        }
        .meme-overlay-close {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 1;
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: none;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          cursor: pointer;
        }
        .meme-overlay-media {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
          background: #000;
          display: block;
          margin: 0 auto;
        }
        .meme-overlay-info {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .meme-overlay-title {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.35;
          margin: 0;
        }
        @media (max-width: 720px) {
          .meme-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .meme-search {
            flex: 1;
          }
          .meme-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 10px;
          }
          .meme-thumb-btn {
            aspect-ratio: 1 / 1;
          }
          .meme-title {
            font-size: 12px;
          }
          .meme-action span {
            display: none;
          }
          .meme-action {
            padding: 6px;
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
