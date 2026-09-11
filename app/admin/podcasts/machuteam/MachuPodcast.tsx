"use client";

import {
  IconEar,
  IconHeadphones,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconSearch,
  IconX,
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

export default function MachuPodcast({ episodes }: { episodes: Episode[]; videos: Video[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);

  const PAGE_SIZE = 30;

  const [currentIdx, setCurrentIdx] = useState(-1);
  const [filtered, setFiltered] = useState(episodes);
  const [page, setPage] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    setFiltered(episodes);
    setPage(1);
  }, [episodes]);

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
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setCurrentIdx((idx) => {
        const next = idx + 1;
        if (next < filtered.length) {
          loadAndPlay(filtered[next], next, a);
          return next;
        }
        setPlaying(false);
        return idx;
      });
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadAndPlay = useCallback(
    async (ep: Episode, idx: number, a?: HTMLAudioElement) => {
      const audio = a ?? audioRef.current;
      if (!audio) return;
      setLoading(true);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      const url = await resolveAudioUrl(ep);
      setLoading(false);
      audio.src = url;
      audio.load();
      audio.play().catch(() => {});
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: ep.title,
          artist: "MachuTeam Podcast",
          album: "Kỳ Án & Truyện Ma",
          artwork: [{ src: ep.img, sizes: "512x512", type: "image/jpeg" }],
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

  /* drag-to-dismiss helpers */
  const onSheetDragStart = (y: number) => {
    dragStartY.current = y;
  };
  const onSheetDragMove = (y: number) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const dy = y - dragStartY.current;
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onSheetDragEnd = (y: number) => {
    if (dragStartY.current === null) return;
    const dy = y - dragStartY.current;
    if (dy > 80) setShowDetail(false);
    else if (sheetRef.current) sheetRef.current.style.transform = "";
    dragStartY.current = null;
  };

  return (
    <>
      {/* ═══ Episode detail overlay ═══ */}
      {showDetail && currentEp && (
        <div className="mp-detail-backdrop">
          <div className="mp-detail-bg" style={{ backgroundImage: `url(${currentEp.img})` }} />
          <div className="mp-detail-bg-shade" />
          <div
            ref={sheetRef}
            className="mp-detail-sheet"
            onMouseDown={(e) => onSheetDragStart(e.clientY)}
            onMouseMove={(e) => onSheetDragMove(e.clientY)}
            onMouseUp={(e) => onSheetDragEnd(e.clientY)}
            onMouseLeave={() => {
              if (sheetRef.current) sheetRef.current.style.transform = "";
              dragStartY.current = null;
            }}
            onTouchStart={(e) => onSheetDragStart(e.touches[0].clientY)}
            onTouchMove={(e) => onSheetDragMove(e.touches[0].clientY)}
            onTouchEnd={(e) => onSheetDragEnd(e.changedTouches[0].clientY)}
          >
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
          <div className="mp-search">
            <IconSearch size={13} stroke={1.8} />
            <input
              type="search"
              placeholder="Tìm tập..."
              value={query}
              onChange={(e) => {
                const q = e.target.value;
                setQuery(q);
                const lq = q.toLowerCase().trim();
                setFiltered(lq ? episodes.filter((ep) => ep.title.toLowerCase().includes(lq)) : episodes);
                setPage(1);
              }}
              autoComplete="off"
            />
            {query && (
              <button
                className="mp-search-x"
                onClick={() => {
                  setQuery("");
                  setFiltered(episodes);
                  setPage(1);
                }}
              >
                <IconX size={11} stroke={2.5} />
              </button>
            )}
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
          {/* Left: time */}
          <div className="mp-player-right">
            <span className="mp-player-time">{fmtTime(currentTime)}</span>
          </div>

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
              <div className="mp-player-title">{currentEp ? currentEp.title : "Chọn một tập để nghe"}</div>
              {currentEp && <div className="mp-player-sub">{currentEp.date}</div>}
            </div>
          </div>

          {/* Right: speed + skip controls */}
          <div className="mp-player-left">
            <button className="mp-pbtn mp-pbtn--speed">1×</button>
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
