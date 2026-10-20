"use client";

import { IconFlower, IconHeart, IconHeartFilled, IconMusic, IconMusicOff, IconSparkles } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Scene = "intro" | "card" | "garden";

type Rose = {
  id: number;
  left: number; // vw %
  bottom: number; // px
  size: number; // px (bloom diameter)
  hue: "pink" | "red" | "cream" | "coral" | "blue" | "mint" | "lilac";
  delay: number; // s
  sway: number; // s period
  z: number;
  stemH: number;
};

const HUES: Record<Rose["hue"], { outer: string; inner: string; core: string; leaf: string }> = {
  pink: { outer: "#f6b4c7", inner: "#f9c9d6", core: "#e37b9a", leaf: "#78a97a" },
  red: { outer: "#e46a7a", inner: "#ec8c99", core: "#b63a4e", leaf: "#78a97a" },
  cream: { outer: "#f9e4c7", inner: "#fdeedb", core: "#dcae7a", leaf: "#8ab98c" },
  coral: { outer: "#f6a68d", inner: "#f8bca7", core: "#e07257", leaf: "#8ab98c" },
  blue: { outer: "#b7cdee", inner: "#cfdef5", core: "#7e9fd1", leaf: "#8ab98c" },
  mint: { outer: "#c6e3c7", inner: "#dcecd9", core: "#8dc091", leaf: "#8ab98c" },
  lilac: { outer: "#d6c6ee", inner: "#e4d9f3", core: "#a98ed0", leaf: "#8ab98c" },
};

const HUE_LIST = Object.keys(HUES) as Rose["hue"][];

function Rose({ hue, size = 120, blooming = true }: { hue: Rose["hue"]; size?: number; blooming?: boolean }) {
  const c = HUES[hue];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <radialGradient id={`g-${hue}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={c.inner} />
          <stop offset="60%" stopColor={c.outer} />
          <stop offset="100%" stopColor={c.core} stopOpacity="0.9" />
        </radialGradient>
      </defs>
      {/* Outer petals ring */}
      <g style={{ transformOrigin: "50px 50px" }} className={blooming ? "rose-ring rose-ring-outer" : undefined}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * 360;
          return (
            <ellipse
              key={i}
              cx="50"
              cy="22"
              rx="14"
              ry="20"
              fill={c.outer}
              opacity="0.95"
              transform={`rotate(${a} 50 50)`}
            />
          );
        })}
      </g>
      {/* Mid petals */}
      <g style={{ transformOrigin: "50px 50px" }} className={blooming ? "rose-ring rose-ring-mid" : undefined}>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * 360 + 15;
          return (
            <ellipse
              key={i}
              cx="50"
              cy="30"
              rx="11"
              ry="16"
              fill={c.inner}
              opacity="0.98"
              transform={`rotate(${a} 50 50)`}
            />
          );
        })}
      </g>
      {/* Inner petals */}
      <g style={{ transformOrigin: "50px 50px" }} className={blooming ? "rose-ring rose-ring-inner" : undefined}>
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * 360 + 30;
          return (
            <ellipse key={i} cx="50" cy="38" rx="7" ry="11" fill={`url(#g-${hue})`} transform={`rotate(${a} 50 50)`} />
          );
        })}
      </g>
      {/* Core */}
      <circle cx="50" cy="50" r="7" fill={c.core} opacity="0.85" />
      <circle cx="50" cy="50" r="3.5" fill={c.inner} />
    </svg>
  );
}

function Stem({ hue, height, size }: { hue: Rose["hue"]; height: number; size: number }) {
  const c = HUES[hue];
  return (
    <svg
      viewBox={`0 0 20 ${height}`}
      width={20}
      height={height}
      style={{ display: "block", overflow: "visible", marginTop: -size * 0.1 }}
    >
      <path
        d={`M10 0 C 10 ${height * 0.3} ${8} ${height * 0.6} 10 ${height}`}
        stroke={c.leaf}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* two leaves */}
      <path d={`M10 ${height * 0.45} q -14 -3 -16 10 q 10 2 16 -10`} fill={c.leaf} opacity="0.9" />
      <path d={`M10 ${height * 0.68} q 14 -3 16 10 q -10 2 -16 -10`} fill={c.leaf} opacity="0.9" />
    </svg>
  );
}

function RoseWithStem({ r, blooming }: { r: Rose; blooming: boolean }) {
  return (
    <div
      className="g-rose"
      style={{
        left: `${r.left}%`,
        bottom: 0,
        zIndex: r.z,
        animationDelay: `${r.delay}s`,
        animationDuration: `${r.sway}s`,
        ["--rose-size" as string]: `${r.size}px`,
        ["--bloom-delay" as string]: `${r.delay}s`,
      }}
    >
      <div className={`g-rose-inner ${blooming ? "bloom" : "seed"}`}>
        <Rose hue={r.hue} size={r.size} blooming={blooming} />
      </div>
      <Stem hue={r.hue} height={r.stemH} size={r.size} />
    </div>
  );
}

// --- Audio: YouTube IFrame player ---
// "Thiên Đường Với Người Thương" — Phương Mỹ Chi x DTAP (official MV)
const YT_VIDEO_ID = "UH21OnJwxZE";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (v: number) => void;
  destroy: () => void;
};
type YTWindow = Window & {
  YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };
  onYouTubeIframeAPIReady?: () => void;
};

function useYouTubeMusic(enabled: boolean, mountRef: React.RefObject<HTMLDivElement | null>) {
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);

  // Load the IFrame API once, then build the player.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as YTWindow;
    const SRC = "https://www.youtube.com/iframe_api";

    const build = () => {
      if (!mountRef.current || !w.YT || playerRef.current) return;
      playerRef.current = new w.YT.Player(mountRef.current, {
        videoId: YT_VIDEO_ID,
        width: "1",
        height: "1",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          loop: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          playlist: YT_VIDEO_ID, // required for loop=1 on a single video
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            playerRef.current?.setVolume(55);
            if (enabled) playerRef.current?.playVideo();
          },
        },
      });
    };

    if (w.YT?.Player) {
      build();
    } else {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        build();
      };
      if (!document.querySelector(`script[src="${SRC}"]`)) {
        const s = document.createElement("script");
        s.src = SRC;
        document.body.appendChild(s);
      }
    }

    return () => {
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play / pause when toggled.
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    if (enabled) p.playVideo();
    else p.pauseVideo();
  }, [enabled]);
}

// --- Floating heart petals ---
type Petal = { id: number; left: number; delay: number; dur: number; size: number; drift: number; isHeart: boolean };

function makePetals(n: number): Petal[] {
  return Array.from({ length: n }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 12,
    dur: 10 + Math.random() * 10,
    size: 10 + Math.random() * 14,
    drift: -40 + Math.random() * 80,
    isHeart: Math.random() < 0.4,
  }));
}

function makeGarden(count = 56): Rose[] {
  const list: Rose[] = [];
  for (let i = 0; i < count; i++) {
    const left = (i / count) * 100 + (Math.random() * 6 - 3);
    const row = Math.floor(Math.random() * 4); // 0 front .. 3 back
    const size = 110 - row * 20 + Math.random() * 20;
    const stemH = 140 - row * 25 + Math.random() * 40;
    list.push({
      id: i,
      left: Math.max(-4, Math.min(104, left)),
      bottom: row * 10,
      size,
      hue: HUE_LIST[Math.floor(Math.random() * HUE_LIST.length)],
      delay: Math.random() * 1.4,
      sway: 4 + Math.random() * 3,
      z: 10 - row,
      stemH,
    });
  }
  // sort by row so back renders first
  return list.sort((a, b) => b.bottom - a.bottom);
}

export default function GiftTool() {
  const [scene, setScene] = useState<Scene>("intro");
  const [music, setMusic] = useState(false);
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [bloomKey, setBloomKey] = useState(0);

  const garden = useMemo(() => makeGarden(60), [bloomKey]);
  const petals = useMemo(() => makePetals(22), []);
  const ytMountRef = useRef<HTMLDivElement | null>(null);

  useYouTubeMusic(music, ytMountRef);

  const openCard = useCallback(() => {
    setScene("card");
    if (!music) setMusic(true); // first gesture = allow audio
  }, [music]);

  const closeCard = useCallback(() => setScene("garden"), []);
  const replayBloom = useCallback(() => {
    setScene("intro");
    setBloomKey((k) => k + 1);
    window.setTimeout(() => setScene("garden"), 650);
  }, []);

  // Keyboard shortcut: ESC to close card
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && scene === "card") setScene(scene === "card" ? "garden" : scene);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scene]);

  const t =
    lang === "vi"
      ? {
          tagline: "Dành BuBu, cả một vườn thương.",
          introTitle: "Từ một bông hoa nhỏ...",
          introHint: "Chạm vào hoa, mở điều dịu dàng anh để dành cho BuBu nhé.",
          gardenCaption: "Từ một bông hoa, cả khu vườn đang thức giấc để chào BuBu...",
          cardHeadingTo: "Gửi BuBu — Minh Ngọc của anh,",
          cardHeadline: "Mong những điều đẹp đẽ\nluôn nở bên BuBu.",
          cardBody1:
            "Một bông hoa có thể làm một ngày thêm đẹp. Còn BuBu, làm cả thế giới của anh DuDu dịu dàng hơn mỗi ngày.",
          cardBody2:
            "Nhân ngày 20/10, anh DuDu chúc Minh Ngọc luôn được yêu thương, được chiều chuộng và có thật nhiều niềm vui. Mong BuBu đủ bình yên để tận hưởng những điều nhỏ bé, đủ tự tin để theo đuổi những điều mình yêu — và luôn có anh ở ngay bên cạnh.",
          cardBody3:
            "Hôm nay, ngày mai và cả những ngày sau nữa, BuBu cứ rạng rỡ theo cách của riêng mình nhé. Anh sẽ luôn là người đứng vỗ tay to nhất.",
          cardSign: "Yêu BuBu nhiều lắm ♡",
          cardOpenGarden: "Ngắm vườn hoa",
          reopenCard: "Đọc lại thiếp",
          replay: "Cho hoa nở lại",
          music: "Nhạc nền",
          back: "Quay lại",
        }
      : {
          tagline: "A whole garden of love, for BuBu.",
          introTitle: "From one tiny flower...",
          introHint: "Tap the rose — a little something is waiting for BuBu.",
          gardenCaption: "From one bloom, the whole garden wakes up to greet BuBu...",
          cardHeadingTo: "To BuBu — my Minh Ngọc,",
          cardHeadline: "May lovely things\nalways bloom beside you, BuBu.",
          cardBody1: "A flower can make a day lovelier. You, BuBu, make my whole world softer every single day.",
          cardBody2:
            "On this October 20th, may Minh Ngọc be deeply loved, endlessly spoiled, and genuinely happy — calm enough to enjoy the small things, brave enough to chase what you love — with me right by your side.",
          cardBody3:
            "Today, tomorrow and all the days after, keep shining in your very own way. I'll be the one clapping the loudest.",
          cardSign: "Love you so much, BuBu ♡",
          cardOpenGarden: "See the garden",
          reopenCard: "Read letter again",
          replay: "Bloom again",
          music: "Music",
          back: "Back",
        };

  return (
    <div className="gift-root">
      {/* hidden YouTube audio player */}
      <div className="yt-sink" aria-hidden>
        <div ref={ytMountRef} />
      </div>
      {/* sky layers */}
      <div className="sky" />
      <div className="sky-glow" />
      <div className="clouds" aria-hidden>
        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="cloud c3" />
        <div className="cloud c4" />
      </div>

      {/* floating hearts / petals */}
      <div className="petals" aria-hidden>
        {petals.map((p) => (
          <span
            key={p.id}
            className="petal"
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              ["--petal-drift" as string]: `${p.drift}px`,
            }}
          >
            {p.isHeart ? (
              <IconHeartFilled size={p.size} color="#f28baa" style={{ opacity: 0.75 }} />
            ) : (
              <span className="petal-dot" style={{ width: p.size, height: p.size }} />
            )}
          </span>
        ))}
      </div>

      {/* top bar */}
      <div className="topbar">
        <div className="brand">
          <IconFlower size={18} />
          <span>20 / 10</span>
        </div>
        <div className="controls">
          <button
            type="button"
            className="iconbtn"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            aria-label="Toggle language"
            title={lang === "vi" ? "English" : "Tiếng Việt"}
          >
            {lang === "vi" ? "EN" : "VI"}
          </button>
          <button
            type="button"
            className="iconbtn"
            onClick={() => setMusic((m) => !m)}
            aria-label={music ? "Mute music" : "Play music"}
            title={t.music}
          >
            {music ? <IconMusic size={18} /> : <IconMusicOff size={18} />}
          </button>
        </div>
      </div>

      <div className="tagline">{t.tagline}</div>

      {/* garden layer — always rendered so transitions can bloom in/out */}
      <div className={`garden ${scene === "garden" ? "on" : "off"}`} key={bloomKey}>
        {garden.map((r) => (
          <RoseWithStem key={r.id} r={r} blooming={scene === "garden"} />
        ))}
        <div className="ground" />
      </div>

      {/* intro — single rose growing */}
      {scene === "intro" && (
        <div className="intro-wrap">
          <div className="intro-title">{t.introTitle}</div>
          <div className="intro-hint">{t.introHint}</div>
          <button type="button" className="hero-rose" onClick={openCard} aria-label={t.cardOpenGarden}>
            <div className="hero-rose-head">
              <Rose hue="pink" size={160} />
              <div className="pulse-ring" />
            </div>
            <div className="hero-rose-stem">
              <svg viewBox="0 0 20 260" width={20} height={260} style={{ overflow: "visible" }}>
                <path
                  d="M10 0 C 8 60, 12 140, 10 260"
                  stroke="#78a97a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M10 120 q -24 -5 -26 14 q 18 3 26 -14" fill="#8ab98c" opacity="0.95" />
                <path d="M10 180 q 24 -5 26 14 q -18 3 -26 -14" fill="#8ab98c" opacity="0.95" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* garden caption + buttons */}
      {scene === "garden" && (
        <div className="garden-ui">
          <div className="garden-caption">
            <IconSparkles size={16} /> {t.gardenCaption}
          </div>
          <div className="garden-buttons">
            <button type="button" className="pill" onClick={() => setScene("card")}>
              <IconHeart size={16} /> {t.reopenCard}
            </button>
            <button type="button" className="pill ghost" onClick={replayBloom}>
              <IconFlower size={16} /> {t.replay}
            </button>
          </div>
        </div>
      )}

      {/* card modal */}
      {scene === "card" && (
        <div
          className="card-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCard();
          }}
        >
          <div className="card">
            <div className="card-icon">
              <Rose hue="pink" size={44} />
            </div>
            <div className="card-to">{t.cardHeadingTo}</div>
            <h1 className="card-headline">
              {t.cardHeadline.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
            </h1>
            <p className="card-body">{t.cardBody1}</p>
            <p className="card-body">{t.cardBody2}</p>
            <p className="card-body">{t.cardBody3}</p>
            <div className="card-sign">{t.cardSign}</div>
            <button type="button" className="card-cta" onClick={closeCard}>
              {t.cardOpenGarden}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .gift-root {
          position: fixed;
          inset: 0;
          overflow: hidden;
          font-family: var(--font), "Be Vietnam Pro", system-ui, sans-serif;
          color: #4a3a44;
        }
        .yt-sink {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          left: -9999px;
          top: -9999px;
        }
        .sky {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg,
              #cfe4f6 0%,
              #e6ecf2 35%,
              #fbe6ea 70%,
              #fff2e4 100%);
        }
        .sky-glow {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(600px 400px at 18% 20%, rgba(255, 215, 230, 0.5), transparent 60%),
            radial-gradient(500px 350px at 82% 15%, rgba(255, 243, 220, 0.55), transparent 60%),
            radial-gradient(900px 500px at 50% 95%, rgba(255, 221, 232, 0.55), transparent 65%);
          pointer-events: none;
        }
        .clouds {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .cloud {
          position: absolute;
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.95), rgba(255,255,255,0) 65%);
          filter: blur(2px);
          border-radius: 999px;
        }
        .cloud.c1 { width: 320px; height: 110px; top: 8%; left: -10%; animation: drift 60s linear infinite; }
        .cloud.c2 { width: 240px; height: 90px; top: 20%; left: 60%; animation: drift 80s linear infinite; animation-delay: -20s; }
        .cloud.c3 { width: 380px; height: 120px; top: 4%; left: 40%; animation: drift 90s linear infinite; animation-delay: -45s; opacity: 0.8; }
        .cloud.c4 { width: 260px; height: 100px; top: 28%; left: 10%; animation: drift 70s linear infinite; animation-delay: -10s; opacity: 0.75; }
        @keyframes drift {
          from { transform: translateX(0); }
          to { transform: translateX(120vw); }
        }

        .topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 50;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(10px);
          border-radius: 999px;
          color: #a85676;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.5px;
          border: 1px solid rgba(232, 180, 197, 0.5);
        }
        .controls { display: flex; gap: 8px; }
        .iconbtn {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(232, 180, 197, 0.6);
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(10px);
          color: #a85676;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          transition: transform 0.15s ease, background 0.2s ease;
        }
        .iconbtn:hover { transform: scale(1.08); background: #fff; }

        .tagline {
          position: absolute;
          top: 60px;
          left: 24px;
          font-style: italic;
          color: #7a5a68;
          font-size: 14px;
          opacity: 0.85;
          z-index: 20;
        }

        /* --- Intro --- */
        .intro-wrap {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 30;
          padding-top: 14vh;
        }
        .intro-title {
          font-size: clamp(22px, 3.4vw, 34px);
          font-style: italic;
          color: #7a4b63;
          margin-bottom: 6px;
          text-shadow: 0 2px 12px rgba(255,255,255,0.6);
          animation: fade-up 0.9s ease both;
        }
        .intro-hint {
          font-size: 13px;
          color: #9a7686;
          margin-bottom: 20px;
          animation: fade-up 1.2s ease both;
          animation-delay: 0.3s;
        }
        .hero-rose {
          background: none;
          border: 0;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding: 0;
          animation: grow-up 1.6s cubic-bezier(.2,.9,.3,1.1) both;
        }
        .hero-rose-head {
          position: relative;
          margin-bottom: -8px;
          z-index: 2;
          transition: transform 0.3s ease;
        }
        .hero-rose:hover .hero-rose-head { transform: scale(1.06) rotate(-3deg); }
        .pulse-ring {
          position: absolute;
          inset: 20px;
          border-radius: 999px;
          border: 2px solid rgba(255, 150, 180, 0.5);
          animation: pulse 2.2s ease-out infinite;
          pointer-events: none;
        }
        .hero-rose-stem { margin-top: -8px; z-index: 1; }
        @keyframes grow-up {
          0% { opacity: 0; transform: translateY(60px) scale(0.6); }
          60% { opacity: 1; }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0% { transform: scale(0.75); opacity: 0.6; }
          80% { transform: scale(1.4); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* --- Garden --- */
        .garden {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 68vh;
          z-index: 15;
          pointer-events: none;
          transition: opacity 0.6s ease;
        }
        .garden.off { opacity: 0; }
        .garden.on { opacity: 1; }
        .ground {
          position: absolute;
          left: -5%;
          right: -5%;
          bottom: 0;
          height: 50px;
          background: linear-gradient(180deg, rgba(146, 184, 148, 0) 0%, rgba(130, 170, 136, 0.5) 100%);
          border-radius: 50% 50% 0 0 / 20px;
        }

        .g-rose {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform-origin: bottom center;
          animation: sway ease-in-out infinite alternate;
        }
        @keyframes sway {
          from { transform: rotate(-2deg); }
          to { transform: rotate(2deg); }
        }
        .g-rose-inner {
          transform-origin: center bottom;
        }
        .g-rose-inner.seed {
          transform: scale(0);
          opacity: 0;
        }
        .g-rose-inner.bloom {
          animation: bloom 1.1s cubic-bezier(.2,.9,.3,1.2) both;
          animation-delay: var(--bloom-delay);
        }
        @keyframes bloom {
          0% { transform: scale(0); opacity: 0; }
          55% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .rose-ring {
          animation: slow-spin 60s linear infinite;
        }
        .rose-ring-mid { animation-direction: reverse; animation-duration: 90s; }
        .rose-ring-inner { animation-duration: 40s; }
        @keyframes slow-spin {
          from { transform: rotate(0); }
          to { transform: rotate(360deg); }
        }

        .garden-ui {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          z-index: 40;
          animation: fade-up 0.9s 0.4s ease both;
        }
        .garden-caption {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-style: italic;
          color: #7a4b63;
          font-size: 15px;
          padding: 8px 16px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(10px);
          border-radius: 999px;
          border: 1px solid rgba(232, 180, 197, 0.4);
        }
        .garden-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: #fff;
          border: 1px solid #f0d1dc;
          border-radius: 999px;
          font-size: 13px;
          color: #a85676;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(197, 128, 158, 0.18);
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 26px rgba(197, 128, 158, 0.25);
        }
        .pill.ghost { background: rgba(255,255,255,0.75); }

        /* --- Card --- */
        .card-backdrop {
          position: absolute;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(70, 50, 70, 0.25);
          backdrop-filter: blur(4px);
          animation: fade 0.3s ease;
        }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        .card {
          position: relative;
          max-width: 440px;
          width: 100%;
          max-height: 92vh;
          overflow-y: auto;
          padding: 36px 32px 28px;
          background: linear-gradient(180deg, #fffaf4 0%, #fdf1e8 100%);
          border-radius: 18px;
          box-shadow:
            0 30px 60px rgba(120, 70, 100, 0.25),
            0 0 0 1px rgba(232, 180, 197, 0.3);
          text-align: center;
          animation: card-in 0.55s cubic-bezier(.2,.9,.3,1.1) both;
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .card-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
        }
        .card-to {
          font-style: italic;
          color: #a85676;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .card-headline {
          font-family: "Be Vietnam Pro", serif;
          font-weight: 500;
          font-size: clamp(22px, 3.6vw, 28px);
          line-height: 1.35;
          color: #4a3240;
          margin-bottom: 22px;
          letter-spacing: 0.3px;
        }
        .card-body {
          font-size: 13.5px;
          line-height: 1.75;
          color: #6a4e5a;
          margin-bottom: 12px;
        }
        .card-sign {
          font-style: italic;
          color: #a85676;
          font-size: 14px;
          margin: 22px 0 20px;
        }
        .card-cta {
          padding: 10px 26px;
          background: linear-gradient(135deg, #f6a2b8, #e37b9a);
          color: #fff;
          border: 0;
          border-radius: 999px;
          font-weight: 500;
          font-size: 13.5px;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(227, 123, 154, 0.4);
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .card-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(227, 123, 154, 0.5);
        }

        /* --- Petals / hearts --- */
        .petals {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 25;
          overflow: hidden;
        }
        .petal {
          position: absolute;
          bottom: -40px;
          display: inline-flex;
          animation: rise linear infinite;
        }
        .petal-dot {
          display: inline-block;
          background: radial-gradient(circle at 35% 30%, #fde3eb, #f6b4c7 65%, #e37b9a);
          border-radius: 60% 40% 60% 40%;
          opacity: 0.7;
        }
        @keyframes rise {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { transform: translate(var(--petal-drift), -110vh) rotate(360deg); opacity: 0; }
        }

        @media (max-width: 640px) {
          .tagline { font-size: 12px; top: 56px; left: 16px; }
          .intro-title { font-size: 22px; }
          .intro-hint { font-size: 12px; padding: 0 24px; text-align: center; }
          .card { padding: 28px 22px 22px; }
          .card-headline { font-size: 22px; }
          .card-body { font-size: 13px; }
          .garden { height: 60vh; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cloud, .petal, .rose-ring, .g-rose, .pulse-ring { animation: none !important; }
          .hero-rose { animation: fade-up 0.6s ease both; }
          .g-rose-inner.bloom { animation: fade-up 0.6s ease both; animation-delay: var(--bloom-delay); }
        }
      `}</style>
    </div>
  );
}
