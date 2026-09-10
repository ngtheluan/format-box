"use client";

import {
  IconBrandYoutube,
  IconEar,
  IconEye,
  IconHeadphones,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import type { Episode, Video } from "./types";

async function resolveAudioUrl(ep: Episode): Promise<string> {
  try {
    const res = await fetch(`/api/podcasts/machuteam?slug=${encodeURIComponent(ep.slug)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.audioUrl) return data.audioUrl;
    }
  } catch {
    /* fall through */
  }
  const normalSlug = ep.slug.replace(/-{2,}/g, "-");
  return `https://machuteam.vn/uploads/audio/singles/${ep.ts}_${normalSlug}.mp3`;
}

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function fmtListens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : String(n);
}

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".0", "")}k`;
  return String(n);
}

function fmtDate(iso: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return "";
  }
}

export default function MachuPodcast({ episodes, videos }: { episodes: Episode[]; videos: Video[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 24;
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<"podcast" | "video">("podcast");
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [filtered, setFiltered] = useState(episodes);
  const [filteredVids, setFilteredVids] = useState(videos);
  const [page, setPage] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  useEffect(() => { setFiltered(episodes); setPage(1); }, [episodes]);
  useEffect(() => { setFilteredVids(videos); }, [videos]);

  // IntersectionObserver: load next page when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setPage((p) => p + 1); },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [tab, filtered]);

  const visibleEps = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  useEffect(() => {
    const a = new Audio();
    audioRef.current = a;

    const onTimeUpdate = () => {
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
          /* ignore */
        }
      }
    };
    const onDuration = () => setDuration(a.duration || 0);
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

    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("durationchange", onDuration);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);

    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("durationchange", onDuration);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadAndPlay = useCallback(
    async function loadAndPlay(ep: Episode, idx: number, a?: HTMLAudioElement) {
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
    (idx: number) => {
      setCurrentIdx(idx);
      loadAndPlay(filtered[idx], idx);
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
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const seek = useCallback((clientX: number) => {
    if (!progressRef.current || !audioRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (audioRef.current.duration) {
      audioRef.current.currentTime = pct * audioRef.current.duration;
    }
    setProgress(pct);
  }, []);

  const onSearch = (q: string) => {
    setQuery(q);
    const lq = q.toLowerCase().trim();
    if (tab === "podcast") {
      setFiltered(lq ? episodes.filter((e) => e.title.toLowerCase().includes(lq)) : episodes);
      setPage(1);
      setCurrentIdx(-1);
    } else {
      setFilteredVids(lq ? videos.filter((v) => v.title.toLowerCase().includes(lq)) : videos);
    }
  };

  const switchTab = (t: "podcast" | "video") => {
    setTab(t);
    setQuery("");
    setPage(1);
    setFiltered(episodes);
    setFilteredVids(videos);
  };

  const currentEp = currentIdx >= 0 ? filtered[currentIdx] : null;
  const listCount = tab === "podcast" ? filtered.length : filteredVids.length;

  return (
    <>
      {/* YouTube embed modal */}
      {activeVideo && (
        <div className="yt-modal" onClick={() => setActiveVideo(null)}>
          <div className="yt-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="yt-modal-header">
              <span className="yt-modal-title">{activeVideo.title}</span>
              <button className="yt-modal-close" onClick={() => setActiveVideo(null)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="yt-embed-wrap">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={activeVideo.title}
              />
            </div>
          </div>
        </div>
      )}

      <div className="pod-wrap">
        <div className="pod-header">
          <h1 className="pod-title">
            <IconHeadphones size={20} stroke={1.8} />
            MachuTeam <span style={{ color: "var(--accent)" }}>Podcast</span>
          </h1>
          <div className="pod-tabs">
            <button className={`pod-tab${tab === "podcast" ? " active" : ""}`} onClick={() => switchTab("podcast")}>
              <IconHeadphones size={13} stroke={1.8} />
              Podcast
            </button>
            <button className={`pod-tab${tab === "video" ? " active" : ""}`} onClick={() => switchTab("video")}>
              <IconBrandYoutube size={13} stroke={1.8} />
              Video
            </button>
          </div>
          <span className="pod-count">
            {listCount} {tab === "podcast" ? "tập" : "video"}
          </span>
          <div className="pod-search">
            <IconSearch size={14} stroke={1.8} />
            <input
              type="search"
              placeholder={tab === "podcast" ? "Tìm tập..." : "Tìm video..."}
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {tab === "podcast" ? (
          filtered.length === 0 ? (
            <div className="pod-empty">Không tìm thấy kết quả.</div>
          ) : (
            <>
              <div className="pod-grid">
                {visibleEps.map((ep, i) => (
                  <div key={ep.ts} className={`ep-card${i === currentIdx ? " active" : ""}`} onClick={() => playEp(i)}>
                    <div className="ep-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ep.img} alt={ep.title} loading="lazy" />
                      <div className="ep-overlay">
                        <div className="ep-play-btn">
                          <IconPlayerPlay size={14} fill="currentColor" stroke={0} />
                        </div>
                      </div>
                    </div>
                    <div className="ep-body">
                      <div className="ep-name">{ep.title}</div>
                      <div className="ep-meta">
                        <span className="ep-listens">
                          <IconEar size={10} stroke={1.8} />
                          {fmtListens(ep.listens)}
                        </span>
                        {ep.date && <span className="ep-date">{ep.date}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {visibleEps.length < filtered.length && (
                <div ref={sentinelRef} className="pod-sentinel" />
              )}
            </>
          )
        ) : filteredVids.length === 0 ? (
          <div className="pod-empty">Không tìm thấy video.</div>
        ) : (
          <div className="pod-grid">
            {filteredVids.map((v) => (
              <div key={v.videoId} className="ep-card yt-card" onClick={() => setActiveVideo(v)}>
                <div className="ep-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt={v.title} loading="lazy" />
                  <div className="ep-overlay">
                    <div className="ep-play-btn yt-play">
                      <IconBrandYoutube size={16} stroke={1.5} />
                    </div>
                  </div>
                </div>
                <div className="ep-body">
                  <div className="ep-name">{v.title}</div>
                  <div className="ep-meta">
                    {v.views > 0 && (
                      <span className="ep-listens">
                        <IconEye size={10} stroke={1.8} />
                        {fmtViews(v.views)}
                      </span>
                    )}
                    <span className="ep-date">{fmtDate(v.published)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed audio player — only visible when podcast tab active or episode loaded */}
      {(tab === "podcast" || currentEp) && (
        <div className="pod-player">
          <div
            ref={progressRef}
            className="pod-progress"
            onMouseDown={(e) => {
              setDragging(true);
              seek(e.clientX);
            }}
            onMouseMove={(e) => {
              if (dragging) seek(e.clientX);
            }}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
            onTouchStart={(e) => {
              setDragging(true);
              seek(e.touches[0].clientX);
            }}
            onTouchMove={(e) => {
              if (dragging) seek(e.touches[0].clientX);
            }}
            onTouchEnd={() => setDragging(false)}
          >
            <div className="pod-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>

          <div className="pod-inner">
            <div className="pod-art">
              {currentEp ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentEp.img} alt={currentEp.title} />
              ) : (
                <IconHeadphones size={18} stroke={1.5} style={{ color: "var(--dim)" }} />
              )}
            </div>

            <div className="pod-info">
              <div className="pod-ep-title">{currentEp ? currentEp.title : "Chọn một tập để nghe"}</div>
              {currentEp && (
                <div className="pod-ep-sub">
                  {currentIdx + 1} / {filtered.length} · {currentEp.date}
                </div>
              )}
            </div>

            <div className="pod-controls">
              <button
                className="pod-btn"
                onClick={() => currentIdx > 0 && playEp(currentIdx - 1)}
                disabled={currentIdx <= 0}
                title="Tập trước"
              >
                <IconPlayerSkipBack size={17} stroke={1.8} />
              </button>
              <button
                className="pod-btn play"
                onClick={togglePlay}
                title={playing ? "Dừng" : "Phát"}
                disabled={loading}
              >
                {loading ? (
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: "2.5px solid rgba(255,255,255,.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "pod-spin .7s linear infinite",
                    }}
                  />
                ) : playing ? (
                  <IconPlayerPause size={18} fill="currentColor" stroke={0} />
                ) : (
                  <IconPlayerPlay size={18} fill="currentColor" stroke={0} />
                )}
              </button>
              <button
                className="pod-btn"
                onClick={() => currentIdx < filtered.length - 1 && playEp(currentIdx + 1)}
                disabled={currentIdx >= filtered.length - 1}
                title="Tập tiếp"
              >
                <IconPlayerSkipForward size={17} stroke={1.8} />
              </button>
            </div>

            <div className="pod-time">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
