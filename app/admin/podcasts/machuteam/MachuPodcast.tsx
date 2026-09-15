"use client";

import {
  IconEar,
  IconHeadphones,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Episode, Video } from "./types";

async function resolveAudioUrl(ep: Episode): Promise<string> {
  try {
    const res = await fetch(`/api/podcasts/machuteam?slug=${encodeURIComponent(ep.slug)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.audioUrl) return data.audioUrl;
    }
  } catch {
    /**/
  }
  return `https://machuteam.vn/uploads/audio/singles/${ep.ts}_${ep.slug.replace(/-{2,}/g, "-")}.mp3`;
}

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return "--:--";
  const m = Math.floor(s / 60),
    sec = Math.floor(s % 60);
  return m >= 60
    ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtListens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : String(n);
}

const LS_PROGRESS = "machu-podcast-progress";
const LS_LAST = "machu-podcast-last";
type ProgressMap = Record<string, number>;
function loadProgressMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_PROGRESS) || "{}");
  } catch {
    return {};
  }
}
function saveProgressFor(slug: string, time: number, duration: number) {
  if (typeof window === "undefined" || !slug) return;
  try {
    const map = loadProgressMap();
    // If nearly finished (>95%) or too short, drop the entry.
    if (duration > 0 && (time / duration > 0.95 || time < 3)) {
      delete map[slug];
    } else {
      map[slug] = time;
    }
    localStorage.setItem(LS_PROGRESS, JSON.stringify(map));
  } catch {
    /**/
  }
}
function getSavedTime(slug: string): number {
  return loadProgressMap()[slug] ?? 0;
}

const squareArtCache = new Map<string, string>();
async function toSquareArt(src: string, size = 512): Promise<string> {
  if (squareArtCache.has(src)) return squareArtCache.get(src)!;
  // Try client-side canvas crop first (works if image is CORS-clean).
  const canvasResult = await new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        const s = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - s) / 2;
        const sy = (img.naturalHeight - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  // Fallback: use free image proxy that square-crops server-side.
  const out =
    canvasResult ??
    `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${size}&h=${size}&fit=cover&output=jpg`;
  squareArtCache.set(src, out);
  return out;
}

export default function MachuPodcast({
  episodes,
  query = "",
}: {
  episodes: Episode[];
  videos: Video[];
  query?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const filteredRef = useRef<Episode[]>(episodes);
  const currentSlugRef = useRef<string>("");
  const lastSaveRef = useRef<number>(0);
  const loadAndPlayRef = useRef<((ep: Episode, idx: number, a?: HTMLAudioElement) => void) | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 30;

  const [currentIdx, setCurrentIdx] = useState(-1);
  const [filtered, setFiltered] = useState(episodes);
  const [page, setPage] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);

  const SPEEDS = [1, 1.5, 2];
  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(speed);
    const next = SPEEDS[(i + 1) % SPEEDS.length];
    setSpeed(next);
    speedRef.current = next;
    if (audioRef.current) audioRef.current.playbackRate = next;
  };
  const fmtSpeed = (s: number) => (Number.isInteger(s) ? `${s}×` : `${s}×`);

  useEffect(() => {
    const lq = query.toLowerCase().trim();
    setFiltered(lq ? episodes.filter((ep) => ep.title.toLowerCase().includes(lq)) : episodes);
    setPage(1);
  }, [episodes, query]);

  useEffect(() => {
    filteredRef.current = filtered;
  }, [filtered]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) setPage((p) => p + 1);
      },
      { rootMargin: "300px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [filtered]);

  const visibleEps = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  useEffect(() => {
    const a = new Audio();
    audioRef.current = a;
    const onTime = () => {
      if (!a.duration) return;
      setCurrentTime(a.currentTime);
      setProgress(a.currentTime / a.duration);
      // Persist progress every ~5s while playing.
      const now = Date.now();
      if (currentSlugRef.current && now - lastSaveRef.current > 5000) {
        lastSaveRef.current = now;
        saveProgressFor(currentSlugRef.current, a.currentTime, a.duration);
      }
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.setPositionState({
            duration: a.duration,
            playbackRate: a.playbackRate,
            position: a.currentTime,
          });
        } catch {
          /**/
        }
      }
    };
    const onDur = () => setDuration(a.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      if (currentSlugRef.current) saveProgressFor(currentSlugRef.current, a.currentTime, a.duration);
    };
    const onEnded = () => {
      if (currentSlugRef.current) saveProgressFor(currentSlugRef.current, a.duration, a.duration);
      setCurrentIdx((idx) => {
        const list = filteredRef.current;
        const next = idx + 1;
        if (next < list.length) {
          (loadAndPlayRef.current ?? loadAndPlay)(list[next], next, a);
          return next;
        }
        setPlaying(false);
        return idx;
      });
    };
    const onBeforeUnload = () => {
      if (currentSlugRef.current) saveProgressFor(currentSlugRef.current, a.currentTime, a.duration);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onBeforeUnload);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      if (currentSlugRef.current) saveProgressFor(currentSlugRef.current, a.currentTime, a.duration);
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadAndPlay = useCallback(
    async (ep: Episode, idx: number, a?: HTMLAudioElement) => {
      const audio = a ?? audioRef.current;
      if (!audio) return;
      // Persist previous track's position before switching.
      if (currentSlugRef.current && currentSlugRef.current !== ep.slug) {
        saveProgressFor(currentSlugRef.current, audio.currentTime, audio.duration);
      }
      currentSlugRef.current = ep.slug;
      try {
        localStorage.setItem(LS_LAST, ep.slug);
      } catch {
        /**/
      }
      setLoading(true);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      const url = await resolveAudioUrl(ep);
      setLoading(false);
      audio.src = url;
      audio.load();
      audio.playbackRate = speedRef.current;
      const savedTime = getSavedTime(ep.slug);
      if (savedTime > 0) {
        const onMeta = () => {
          try {
            audio.currentTime = savedTime;
          } catch {
            /**/
          }
          audio.removeEventListener("loadedmetadata", onMeta);
        };
        audio.addEventListener("loadedmetadata", onMeta);
      }
      audio.play().catch(() => {});
      if ("mediaSession" in navigator) {
        const artSrc = await toSquareArt(ep.img, 512);
        navigator.mediaSession.metadata = new MediaMetadata({
          title: ep.title,
          artist: "MachuTeam Podcast",
          album: "Kỳ Án & Truyện Ma",
          artwork: [{ src: artSrc, sizes: "512x512", type: "image/jpeg" }],
        });
        navigator.mediaSession.setActionHandler("play", () => audio.play());
        navigator.mediaSession.setActionHandler("pause", () => audio.pause());
        navigator.mediaSession.setActionHandler("previoustrack", () =>
          setCurrentIdx((i) => {
            const ni = Math.max(0, i - 1);
            loadAndPlay(filtered[ni], ni);
            return ni;
          }),
        );
        navigator.mediaSession.setActionHandler("nexttrack", () =>
          setCurrentIdx((i) => {
            const ni = Math.min(filtered.length - 1, i + 1);
            loadAndPlay(filtered[ni], ni);
            return ni;
          }),
        );
        navigator.mediaSession.setActionHandler("seekbackward", () => {
          audio.currentTime = Math.max(0, audio.currentTime - 10);
        });
        navigator.mediaSession.setActionHandler("seekforward", () => {
          audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 30);
        });
      }
    },
    [filtered],
  );

  useEffect(() => {
    loadAndPlayRef.current = loadAndPlay;
  }, [loadAndPlay]);

  const playEp = useCallback(
    (i: number) => {
      setCurrentIdx(i);
      loadAndPlay(filtered[i], i);
    },
    [filtered, loadAndPlay],
  );
  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (currentIdx < 0) {
      playEp(0);
      return;
    }
    a.paused ? a.play().catch(() => {}) : a.pause();
  };

  const seekOn = useCallback((ref: React.RefObject<HTMLDivElement | null>, clientX: number) => {
    if (!ref.current || !audioRef.current) return;
    const r = ref.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    if (audioRef.current.duration) audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct);
  }, []);

  const skip = useCallback((s: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + s));
  }, []);

  const currentEp = currentIdx >= 0 ? filtered[currentIdx] : null;

  return (
    <>
      {/* ═══ Episode detail overlay ═══ */}
      {showDetail && currentEp && (
        <div className="mp-detail-backdrop" onClick={() => setShowDetail(false)}>
          <div className="mp-detail-bg" style={{ backgroundImage: `url(${currentEp.img})` }} />
          <div className="mp-detail-bg-shade" />
          <div ref={sheetRef} className="mp-detail-sheet" onClick={(e) => e.stopPropagation()}>
            <div className={`mp-detail-art${playing ? " playing" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentEp.img} alt={currentEp.title} />
            </div>

            <div className="mp-detail-info">
              <div className="mp-detail-title">{currentEp.title}</div>
              <div className="mp-detail-sub">
                <IconEar
                  size={11}
                  stroke={1.8}
                  style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }}
                />
                {fmtListens(currentEp.listens)} · {currentEp.date}
              </div>
            </div>

            <div
              ref={scrubberRef}
              className="mp-detail-scrub"
              onMouseDown={(e) => seekOn(scrubberRef, e.clientX)}
              onMouseMove={(e) => {
                if (e.buttons === 1) seekOn(scrubberRef, e.clientX);
              }}
              onTouchStart={(e) => seekOn(scrubberRef, e.touches[0].clientX)}
              onTouchMove={(e) => seekOn(scrubberRef, e.touches[0].clientX)}
            >
              <div className="mp-detail-scrub-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="mp-detail-times">
              <span>{fmtTime(currentTime)}</span>
              <span>-{fmtTime(duration - currentTime)}</span>
            </div>

            <div className="mp-detail-ctrls">
              <button
                className="mp-dbtn"
                onClick={() => currentIdx > 0 && playEp(currentIdx - 1)}
                disabled={currentIdx <= 0}
              >
                <IconPlayerSkipBack size={26} stroke={1.8} />
              </button>
              <button className="mp-dbtn" onClick={() => skip(-15)}>
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <text
                    x="7.5"
                    y="16"
                    fontSize="7"
                    fontWeight="700"
                    stroke="none"
                    fill="currentColor"
                    fontFamily="system-ui"
                  >
                    15
                  </text>
                </svg>
              </button>
              <button className="mp-dbtn mp-dbtn--main" onClick={togglePlay} disabled={loading}>
                {loading ? (
                  <span className="mp-spin" />
                ) : playing ? (
                  <IconPlayerPause size={28} fill="currentColor" stroke={0} />
                ) : (
                  <IconPlayerPlay size={28} fill="currentColor" stroke={0} />
                )}
              </button>
              <button className="mp-dbtn" onClick={() => skip(30)}>
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <text
                    x="7"
                    y="16"
                    fontSize="7"
                    fontWeight="700"
                    stroke="none"
                    fill="currentColor"
                    fontFamily="system-ui"
                  >
                    30
                  </text>
                </svg>
              </button>
              <button
                className="mp-dbtn"
                onClick={() => currentIdx < filtered.length - 1 && playEp(currentIdx + 1)}
                disabled={currentIdx >= filtered.length - 1}
              >
                <IconPlayerSkipForward size={26} stroke={1.8} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Main page ═══ */}
      <div className="mp-page">
        {/* Sticky header */}
        <div className="mp-header">
          <div className="mp-header-left">
            <IconHeadphones size={18} stroke={1.8} className="mp-header-icon" />
            <span className="mp-header-title">
              MachuTeam <em>Podcast</em>
            </span>
            <span className="mp-header-badge">{filtered.length}</span>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="mp-empty">Không tìm thấy kết quả nào.</div>
        ) : (
          <>
            <div className="mp-grid">
              {visibleEps.map((ep, i) => (
                <div
                  key={ep.ts}
                  className={`mp-card${i === currentIdx ? " active" : ""}${i === currentIdx && playing ? " playing" : ""}`}
                  onClick={() => playEp(i)}
                >
                  <div className="mp-card-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ep.img} alt={ep.title} loading="lazy" />
                    <div className="mp-card-overlay">
                      {i === currentIdx && playing ? (
                        <div className="mp-bars">
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : (
                        <div className="mp-card-playbtn">
                          <IconPlayerPlay size={14} fill="currentColor" stroke={0} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mp-card-body">
                    <div className="mp-card-title">{ep.title}</div>
                    <div className="mp-card-meta">
                      <IconEar size={10} stroke={1.8} />
                      {fmtListens(ep.listens)}
                      {ep.date && <span className="mp-card-date">{ep.date}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {visibleEps.length < filtered.length && <div ref={sentinelRef} className="mp-sentinel" />}
          </>
        )}
      </div>

      {/* ═══ Fixed player ═══ */}
      <div className="mp-player">
        <div className="mp-player-pill">
          {/* Center: scrubber + art + info */}
          <div className="mp-player-center" onClick={() => currentEp && setShowDetail(true)}>
            {/* Art */}
            <div className="mp-player-art">
              {currentEp ? (
                /* eslint-disable-next-line @next/next/no-img-element */ <img src={currentEp.img} alt="" />
              ) : (
                <IconHeadphones size={16} stroke={1.4} />
              )}
            </div>
            {/* Info */}
            <div className="mp-player-info">
              <div className="mp-player-title">{currentEp ? currentEp.title : ""}</div>
              {currentEp && (
                <div className="mp-player-sub">
                  <span className="mp-player-time">
                    {fmtTime(currentTime)}
                    <span className="mp-player-time-sep"> / </span>
                    <span className="mp-player-time-total">{fmtTime(duration)}</span>
                  </span>
                  <span className="mp-player-sub-dot">·</span>
                  <span>{currentEp.date}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: speed + skip controls */}
          <div className="mp-player-right">
            <button className="mp-pbtn mp-pbtn--speed" onClick={cycleSpeed} title="Tốc độ phát">
              {fmtSpeed(speed)}
            </button>
            <button className="mp-pbtn" onClick={() => skip(-15)} disabled={currentIdx < 0}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <text
                  x="7.5"
                  y="16.5"
                  fontSize="6.5"
                  fontWeight="700"
                  stroke="none"
                  fill="currentColor"
                  fontFamily="system-ui"
                >
                  15
                </text>
              </svg>
            </button>
            <button className="mp-pbtn mp-pbtn--play" onClick={togglePlay} disabled={loading}>
              {loading ? (
                <span className="mp-spin mp-spin--dark" />
              ) : playing ? (
                <IconPlayerPause size={20} fill="currentColor" stroke={0} />
              ) : (
                <IconPlayerPlay size={20} fill="currentColor" stroke={0} />
              )}
            </button>
            <button className="mp-pbtn" onClick={() => skip(30)} disabled={currentIdx < 0}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <text
                  x="7"
                  y="16.5"
                  fontSize="6.5"
                  fontWeight="700"
                  stroke="none"
                  fill="currentColor"
                  fontFamily="system-ui"
                >
                  30
                </text>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrubber — full width below pill */}
        <div
          ref={progressRef}
          className={`mp-player-track${dragging ? " dragging" : ""}`}
          onMouseDown={(e) => {
            setDragging(true);
            seekOn(progressRef, e.clientX);
          }}
          onMouseMove={(e) => {
            if (dragging) seekOn(progressRef, e.clientX);
          }}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => {
            if (!dragging) return;
            setDragging(false);
          }}
          onTouchStart={(e) => {
            setDragging(true);
            seekOn(progressRef, e.touches[0].clientX);
          }}
          onTouchMove={(e) => {
            if (dragging) seekOn(progressRef, e.touches[0].clientX);
          }}
          onTouchEnd={() => setDragging(false)}
        >
          <div className="mp-player-fill" style={{ width: `${progress * 100}%` }}>
            <div className="mp-player-thumb" />
          </div>
        </div>
      </div>
    </>
  );
}
