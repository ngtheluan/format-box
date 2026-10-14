"use client";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowLeft,
  IconMaximize,
  IconMinimize,
  IconPlayerPlay,
  IconRefresh,
  IconTrophy,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Resolution-independent world (fractions 0..1). Tuned to be forgiving.
// ---------------------------------------------------------------------------
const GRAV = 0.0009;
const FLAP = -0.0178;
const MAX_FALL = 0.026;
const SPEED = 0.0062;
const GAP_HALF = 0.175;
const PIPE_W = 0.15;
const PIPE_SPACING = 0.74;
const BIRD_X = 0.28;
const RADIUS = 0.032;
const GROUND = 0.13;

type Phase = "menu" | "playing" | "over";
type Pipe = { xr: number; gr: number; passed: boolean };
type ObKind = "pipe" | "water" | "rock" | "lava";
type Fx = "rain" | "quake" | "volcano" | undefined;

type Scene = {
  id: string;
  nameKey: string;
  sky: [string, string, string];
  ground: string;
  groundDark: string;
  groundEdge: string;
  cloud: number;
  stars: boolean;
  fx: Fx;
  ob: { kind: ObKind; c: [string, string, string]; accent: string };
};
type Character = {
  id: string;
  nameKey: string;
  type: "bee" | "dino" | "plane";
  body: [string, string];
  wing: string;
  accent: string;
};

const SCENES: Scene[] = [
  {
    id: "day",
    nameKey: "flappy_scene_day",
    sky: ["#4ec0ff", "#8fd8ff", "#cdeeff"],
    ground: "#ded895",
    groundDark: "#c9b972",
    groundEdge: "#8fd85a",
    cloud: 0.85,
    stars: false,
    fx: undefined,
    ob: { kind: "pipe", c: ["#5bbd3f", "#7ed957", "#4a9e30"], accent: "rgba(255,255,255,0.22)" },
  },
  {
    id: "sunset",
    nameKey: "flappy_scene_sunset",
    sky: ["#ff8a5c", "#ffb27a", "#ffd9a0"],
    ground: "#d9a86c",
    groundDark: "#bd8b51",
    groundEdge: "#e8c07a",
    cloud: 0.6,
    stars: false,
    fx: undefined,
    ob: { kind: "pipe", c: ["#c2612e", "#e08a4a", "#a04d23"], accent: "rgba(255,255,255,0.2)" },
  },
  {
    id: "night",
    nameKey: "flappy_scene_night",
    sky: ["#0e1b34", "#182a4d", "#22375f"],
    ground: "#2b3750",
    groundDark: "#1f2a3a",
    groundEdge: "#3a5a86",
    cloud: 0.28,
    stars: true,
    fx: undefined,
    ob: { kind: "pipe", c: ["#2f7d5b", "#3fa377", "#265f45"], accent: "rgba(255,255,255,0.15)" },
  },
  {
    id: "rain",
    nameKey: "flappy_scene_rain",
    sky: ["#5b6b7a", "#7c8b98", "#9fb0bb"],
    ground: "#6b7563",
    groundDark: "#565f4f",
    groundEdge: "#8a9a6a",
    cloud: 0.5,
    stars: false,
    fx: "rain",
    ob: { kind: "water", c: ["#3f7fae", "#5fa7cf", "#2f6f95"], accent: "rgba(255,255,255,0.4)" },
  },
  {
    id: "quake",
    nameKey: "flappy_scene_quake",
    sky: ["#b28a63", "#cda884", "#e3c79e"],
    ground: "#8a6b4a",
    groundDark: "#6f5439",
    groundEdge: "#a5804f",
    cloud: 0.4,
    stars: false,
    fx: "quake",
    ob: { kind: "rock", c: ["#7a6f63", "#9a8d7d", "#5f564c"], accent: "rgba(0,0,0,0.28)" },
  },
  {
    id: "volcano",
    nameKey: "flappy_scene_volcano",
    sky: ["#3a0f0f", "#7a1e12", "#c24a1e"],
    ground: "#2a1a16",
    groundDark: "#1c110e",
    groundEdge: "#e0561f",
    cloud: 0.2,
    stars: false,
    fx: "volcano",
    ob: { kind: "lava", c: ["#3a221c", "#5a352a", "#281612"], accent: "#ff6a1e" },
  },
];

const CHARACTERS: Character[] = [
  {
    id: "bee",
    nameKey: "flappy_char_bee",
    type: "bee",
    body: ["#ffd54a", "#f5a623"],
    wing: "rgba(215,238,255,0.85)",
    accent: "#2a2a2a",
  },
  {
    id: "dino",
    nameKey: "flappy_char_dino",
    type: "dino",
    body: ["#8ad2ac", "#3f9e74"],
    wing: "#67bd93",
    accent: "#f2a03d",
  },
  {
    id: "plane",
    nameKey: "flappy_char_plane",
    type: "plane",
    body: ["#eef2f7", "#94a3b8"],
    wing: "#c7d2df",
    accent: "#2d7dd2",
  },
];

const MELODY = [523, 0, 659, 784, 0, 659, 523, 587, 0, 494, 587, 0, 440, 0, 523, 0];

const SCORES_KEY = "fb-flappy-scores";
const MUTE_KEY = "fb-flappy-muted";
const SCENE_KEY = "fb-flappy-scene";
const CHAR_KEY = "fb-flappy-char";

export default function FlappyBirdTool() {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [isNewBest, setIsNewBest] = useState(false);
  const [muted, setMuted] = useState(false);
  const [sceneId, setSceneId] = useState("day");
  const [charId, setCharId] = useState("bee");
  const [isFs, setIsFs] = useState(false);

  const mutedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<{ timer: number | null; step: number }>({ timer: null, step: 0 });

  const s = useRef({
    phase: "menu" as Phase,
    birdYr: 0.5,
    velr: 0,
    pipes: [] as Pipe[],
    score: 0,
    wing: 0,
    scroll: 0,
    clouds: [] as { xr: number; yr: number; sc: number }[],
    stars: [] as { xr: number; yr: number; r: number }[],
    rain: [] as { xr: number; yr: number; len: number; sp: number }[],
    embers: [] as { xr: number; yr: number; vy: number; r: number }[],
    selScene: "day",
    scene: SCENES[0],
    char: CHARACTERS[0],
    W: 360,
    H: 480,
  });

  const best = scores[0] ?? 0;

  // ---- Audio ----
  const ensureCtx = useCallback(() => {
    if (mutedRef.current) return null;
    if (!audioRef.current) {
      try {
        const AC =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioRef.current = new AC();
      } catch {
        return null;
      }
    }
    const ctx = audioRef.current;
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }, []);

  const beep = useCallback(
    (freq: number, dur: number, type: OscillatorType, vol: number, freqEnd?: number, delay = 0) => {
      const ctx = ensureCtx();
      if (!ctx) return;
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    },
    [ensureCtx],
  );

  // Jump: soft, gentle upward chirp (quiet)
  const sndFlap = useCallback(() => {
    beep(560, 0.06, "sine", 0.07, 880);
  }, [beep]);
  const sndScore = useCallback(() => {
    beep(880, 0.08, "sine", 0.2);
    beep(1180, 0.1, "sine", 0.2, undefined, 0.07);
  }, [beep]);
  // Hit: soft muffled thud (quiet)
  const sndHit = useCallback(() => {
    beep(190, 0.09, "triangle", 0.13, 90);
    beep(95, 0.32, "sine", 0.12, 48, 0.05);
  }, [beep]);

  const startMusic = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = ensureCtx();
    if (!ctx || musicRef.current.timer != null) return;
    const stepDur = 0.22;
    musicRef.current.timer = window.setInterval(() => {
      if (mutedRef.current) return;
      const c = audioRef.current;
      if (!c) return;
      const i = musicRef.current.step % MELODY.length;
      const f = MELODY[i];
      const t0 = c.currentTime + 0.02;
      if (f > 0) {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + stepDur * 0.95);
        osc.connect(g).connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + stepDur);
      }
      if (i % 4 === 0) {
        const bass = c.createOscillator();
        const bg = c.createGain();
        bass.type = "triangle";
        bass.frequency.value = 130.8;
        bg.gain.setValueAtTime(0.0001, t0);
        bg.gain.exponentialRampToValueAtTime(0.04, t0 + 0.03);
        bg.gain.exponentialRampToValueAtTime(0.0001, t0 + stepDur * 3.5);
        bass.connect(bg).connect(c.destination);
        bass.start(t0);
        bass.stop(t0 + stepDur * 4);
      }
      musicRef.current.step++;
    }, stepDur * 1000);
  }, [ensureCtx]);

  const stopMusic = useCallback(() => {
    if (musicRef.current.timer != null) {
      clearInterval(musicRef.current.timer);
      musicRef.current.timer = null;
    }
  }, []);

  // ---- Init ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      if (raw) setScores(JSON.parse(raw));
      const m = localStorage.getItem(MUTE_KEY) === "1";
      mutedRef.current = m;
      setMuted(m);
      const sv = localStorage.getItem(SCENE_KEY);
      if (sv && (sv === "random" || SCENES.some((x) => x.id === sv))) {
        setSceneId(sv);
        s.current.selScene = sv;
        s.current.scene = sv === "random" ? SCENES[0] : SCENES.find((x) => x.id === sv)!;
      }
      const cv = localStorage.getItem(CHAR_KEY);
      const ci = CHARACTERS.find((x) => x.id === cv);
      if (ci) {
        setCharId(ci.id);
        s.current.char = ci;
      }
    } catch {}
    s.current.clouds = Array.from({ length: 3 }, (_, i) => ({
      xr: 0.2 + i * 0.35,
      yr: 0.12 + Math.random() * 0.3,
      sc: 0.7 + Math.random() * 0.6,
    }));
    s.current.stars = Array.from({ length: 26 }, () => ({
      xr: Math.random(),
      yr: Math.random() * 0.7,
      r: 0.6 + Math.random() * 1.4,
    }));
    s.current.rain = Array.from({ length: 70 }, () => ({
      xr: Math.random(),
      yr: Math.random(),
      len: 0.02 + Math.random() * 0.03,
      sp: 0.03 + Math.random() * 0.02,
    }));
    s.current.embers = Array.from({ length: 22 }, () => ({
      xr: Math.random(),
      yr: Math.random(),
      vy: 0.004 + Math.random() * 0.006,
      r: 1 + Math.random() * 2,
    }));
    return () => stopMusic();
  }, [stopMusic]);

  // Fullscreen state sync
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const nm = !m;
      mutedRef.current = nm;
      try {
        localStorage.setItem(MUTE_KEY, nm ? "1" : "0");
      } catch {}
      if (nm) stopMusic();
      else startMusic();
      return nm;
    });
  }, [startMusic, stopMusic]);

  const pickScene = useCallback((id: string) => {
    setSceneId(id);
    s.current.selScene = id;
    s.current.scene =
      id === "random" ? SCENES[Math.floor(Math.random() * SCENES.length)] : SCENES.find((x) => x.id === id)!;
    try {
      localStorage.setItem(SCENE_KEY, id);
    } catch {}
  }, []);
  const pickChar = useCallback((id: string) => {
    setCharId(id);
    const c = CHARACTERS.find((x) => x.id === id)!;
    s.current.char = c;
    try {
      localStorage.setItem(CHAR_KEY, id);
    } catch {}
  }, []);

  const start = useCallback(() => {
    const g = s.current;
    if (g.selScene === "random") g.scene = SCENES[Math.floor(Math.random() * SCENES.length)];
    g.birdYr = 0.5;
    g.velr = FLAP;
    g.pipes = [{ xr: 1.05, gr: 0.5, passed: false }];
    g.score = 0;
    g.phase = "playing";
    setScore(0);
    setIsNewBest(false);
    setPhase("playing");
    startMusic();
    sndFlap();
  }, [startMusic, sndFlap]);

  const flap = useCallback(() => {
    if (s.current.phase === "playing") {
      s.current.velr = FLAP;
      sndFlap();
    }
  }, [sndFlap]);

  const goMenu = useCallback(() => {
    s.current.phase = "menu";
    setPhase("menu");
  }, []);

  const endGame = useCallback(() => {
    const g = s.current;
    if (g.phase !== "playing") return;
    g.phase = "over";
    setPhase("over");
    sndHit();
    setScores((prev) => {
      const next = [...prev, g.score].sort((a, b) => b - a).slice(0, 10);
      if (g.score > 0 && g.score > (prev[0] ?? 0)) setIsNewBest(true);
      try {
        localStorage.setItem(SCORES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [sndHit]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        const p = s.current.phase;
        if (p === "playing") flap();
        else start();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap, start, toggleMute]);

  // Responsive backing store
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.current.W = rect.width;
      s.current.H = rect.height;
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      const rad = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + w, y, x + w, y + h, rad);
      ctx.arcTo(x + w, y + h, x, y + h, rad);
      ctx.arcTo(x, y + h, x, y, rad);
      ctx.arcTo(x, y, x + w, y, rad);
      ctx.closePath();
    };

    const drawCloud = (cx: number, cy: number, scale: number, alpha: number) => {
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 16 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 18 * scale, cy + 4 * scale, 13 * scale, 0, Math.PI * 2);
      ctx.arc(cx - 18 * scale, cy + 4 * scale, 12 * scale, 0, Math.PI * 2);
      ctx.arc(cx, cy + 8 * scale, 16 * scale, 0, Math.PI * 2);
      ctx.fill();
    };

    // Draw one obstacle segment (top or bottom column)
    const drawSeg = (
      kind: ObKind,
      c: [string, string, string],
      accent: string,
      px: number,
      pw: number,
      y: number,
      h: number,
      capAtBottom: boolean,
    ) => {
      if (h <= 0) return;
      const grad = ctx.createLinearGradient(px, 0, px + pw, 0);
      grad.addColorStop(0, c[0]);
      grad.addColorStop(0.5, c[1]);
      grad.addColorStop(1, c[2]);
      ctx.save();
      if (kind === "water") ctx.globalAlpha = 0.82;
      ctx.fillStyle = grad;
      rr(px, y, pw, h, kind === "rock" ? 3 : 5);
      ctx.fill();
      ctx.restore();

      // detail per kind
      if (kind === "pipe" || kind === "water") {
        ctx.fillStyle = accent;
        ctx.fillRect(px + pw * 0.16, y, pw * 0.12, h);
      } else if (kind === "rock") {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        for (let i = 1; i <= 3; i++) {
          const yy = y + (h * i) / 4;
          ctx.beginPath();
          ctx.moveTo(px + pw * 0.15, yy);
          ctx.lineTo(px + pw * 0.55, yy + (i % 2 ? 4 : -4));
          ctx.lineTo(px + pw * 0.85, yy);
          ctx.stroke();
        }
      } else if (kind === "lava") {
        const glow = ctx.createLinearGradient(px, 0, px + pw, 0);
        glow.addColorStop(0, "transparent");
        glow.addColorStop(0.5, accent);
        glow.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = glow;
        ctx.fillRect(px + pw * 0.38, y, pw * 0.24, h);
        ctx.globalAlpha = 1;
      }
      // cap
      const capH = Math.min(h, s.current.H * 0.028);
      const over = pw * 0.14;
      const capY = capAtBottom ? y : y + h - capH;
      ctx.save();
      if (kind === "water") ctx.globalAlpha = 0.9;
      ctx.fillStyle = grad;
      rr(px - over, capY, pw + over * 2, capH, kind === "rock" ? 3 : 5);
      ctx.fill();
      ctx.restore();
    };

    const drawChar = (r: number, char: Character) => {
      const g = s.current;
      if (char.type === "plane") {
        // fuselage
        const bg = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
        bg.addColorStop(0, char.body[0]);
        bg.addColorStop(1, char.body[1]);
        ctx.fillStyle = bg;
        rr(-r * 1.3, -r * 0.42, r * 2.7, r * 0.84, r * 0.42);
        ctx.fill();
        // nose
        ctx.beginPath();
        ctx.moveTo(r * 1.4, -r * 0.3);
        ctx.lineTo(r * 1.85, 0);
        ctx.lineTo(r * 1.4, r * 0.3);
        ctx.closePath();
        ctx.fill();
        // tail fin
        ctx.beginPath();
        ctx.moveTo(-r * 1.3, -r * 0.1);
        ctx.lineTo(-r * 1.7, -r * 0.85);
        ctx.lineTo(-r * 0.85, -r * 0.1);
        ctx.closePath();
        ctx.fill();
        // wing
        ctx.fillStyle = char.wing;
        ctx.beginPath();
        ctx.moveTo(-r * 0.1, r * 0.1);
        ctx.lineTo(-r * 0.9, r * 0.95);
        ctx.lineTo(r * 0.5, r * 0.2);
        ctx.closePath();
        ctx.fill();
        // cockpit
        ctx.fillStyle = char.accent;
        ctx.beginPath();
        ctx.ellipse(r * 0.55, -r * 0.12, r * 0.32, r * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        // propeller
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = Math.max(1, r * 0.12);
        const pa = g.wing * 2;
        ctx.beginPath();
        ctx.moveTo(r * 1.82, Math.sin(pa) * r * 0.5);
        ctx.lineTo(r * 1.82, -Math.sin(pa) * r * 0.5);
        ctx.stroke();
        return;
      }
      // shared body
      const bg = ctx.createLinearGradient(0, -r, 0, r);
      bg.addColorStop(0, char.body[0]);
      bg.addColorStop(1, char.body[1]);

      if (char.type === "dino") {
        // Pteranodon gliding, elegant swept wings
        const wf = Math.sin(g.wing);
        const membraneDark = char.body[1];
        // far wing (behind body)
        ctx.save();
        ctx.rotate(wf * 0.18);
        ctx.fillStyle = membraneDark;
        ctx.beginPath();
        ctx.moveTo(-r * 0.1, -r * 0.05);
        ctx.quadraticCurveTo(-r * 1.7, -r * 0.7 - wf * r * 0.35, -r * 2.2, r * 0.15);
        ctx.quadraticCurveTo(-r * 1.2, r * 0.2, -r * 0.1, r * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // tail
        ctx.strokeStyle = membraneDark;
        ctx.lineWidth = r * 0.16;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, r * 0.05);
        ctx.lineTo(-r * 1.65, r * 0.28);
        ctx.stroke();
        ctx.fillStyle = membraneDark;
        ctx.beginPath();
        ctx.moveTo(-r * 1.55, r * 0.1);
        ctx.lineTo(-r * 1.9, r * 0.28);
        ctx.lineTo(-r * 1.55, r * 0.46);
        ctx.closePath();
        ctx.fill();
        // body
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.0, r * 0.6, -0.16, 0, Math.PI * 2);
        ctx.fill();
        // neck + head
        ctx.beginPath();
        ctx.arc(r * 0.85, -r * 0.32, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // backward crest (Pteranodon)
        ctx.beginPath();
        ctx.moveTo(r * 0.72, -r * 0.55);
        ctx.quadraticCurveTo(r * 0.05, -r * 1.05, r * 0.28, -r * 0.42);
        ctx.closePath();
        ctx.fill();
        // long pointed beak
        ctx.fillStyle = char.accent;
        ctx.beginPath();
        ctx.moveTo(r * 1.15, -r * 0.46);
        ctx.lineTo(r * 2.25, -r * 0.12);
        ctx.lineTo(r * 1.15, -r * 0.02);
        ctx.closePath();
        ctx.fill();
        // eye
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(r * 0.95, -r * 0.38, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(r * 1.0, -r * 0.38, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
        // near wing (in front, big flap)
        ctx.save();
        ctx.rotate(wf * 0.4);
        ctx.fillStyle = char.wing;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.1);
        ctx.quadraticCurveTo(-r * 1.1, -r * 1.15 - wf * r * 0.5, -r * 1.95, -r * 0.1);
        ctx.quadraticCurveTo(-r * 1.0, r * 0.15, 0, r * 0.28);
        ctx.closePath();
        ctx.fill();
        // wing finger veins
        ctx.strokeStyle = "rgba(0,0,0,0.14)";
        ctx.lineWidth = Math.max(1, r * 0.06);
        for (const [tx, ty] of [
          [-r * 1.95, -r * 0.1],
          [-r * 1.4, -r * 0.65],
          [-r * 0.8, -r * 0.75],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(tx, ty - wf * r * 0.3);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      // bee
      const wf = 0.55 + Math.abs(Math.sin(g.wing)) * 0.5;
      // wings (translucent, behind body)
      ctx.fillStyle = char.wing;
      for (const [wx, wy, rot] of [
        [-r * 0.05, -r * 0.75, -0.35],
        [-r * 0.55, -r * 0.62, -0.8],
      ] as const) {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.62, r * 0.34 * wf, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // body
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.1, r * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      // stripes (clipped to body)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.1, r * 0.82, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "rgba(25,25,25,0.92)";
      ctx.fillRect(-r * 0.05, -r, r * 0.28, r * 2);
      ctx.fillRect(r * 0.55, -r, r * 0.26, r * 2);
      ctx.restore();
      // head
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.arc(r * 0.98, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(r * 1.12, -r * 0.14, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(r * 1.17, -r * 0.14, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      // stinger
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.moveTo(-r * 1.05, -r * 0.12);
      ctx.lineTo(-r * 1.5, 0);
      ctx.lineTo(-r * 1.05, r * 0.12);
      ctx.closePath();
      ctx.fill();
      // antennae
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = Math.max(1, r * 0.07);
      for (const dy of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(r * 1.2, -r * 0.25);
        ctx.quadraticCurveTo(r * 1.55, -r * 0.55 - dy * r * 0.1, r * 1.7, -r * 0.5 - dy * r * 0.18);
        ctx.stroke();
        ctx.fillStyle = "#2a2a2a";
        ctx.beginPath();
        ctx.arc(r * 1.7, -r * 0.5 - dy * r * 0.18, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(now - last, 40);
      last = now;
      const k = dt / 16.67;
      const g = s.current;
      const { W, H, scene, char } = g;
      const groundH = H * GROUND;
      const floorY = H - groundH;
      const radPx = H * RADIUS;
      const birdXpx = W * BIRD_X;

      g.wing += dt * 0.02;

      if (g.phase === "playing") {
        g.velr = Math.min(g.velr + GRAV * k, MAX_FALL);
        g.birdYr += g.velr * k;
        g.scroll += SPEED * k;

        const rightmost = g.pipes.reduce((m, p) => Math.max(m, p.xr), -Infinity);
        if (g.pipes.length === 0 || rightmost <= 1 - PIPE_SPACING) {
          const lo = GAP_HALF + 0.05;
          const hi = 1 - GROUND - GAP_HALF - 0.05;
          g.pipes.push({ xr: 1.06, gr: lo + Math.random() * (hi - lo), passed: false });
        }
        for (const p of g.pipes) p.xr -= SPEED * k;
        g.pipes = g.pipes.filter((p) => p.xr * W + PIPE_W * W > 0);

        const birdYpx = g.birdYr * H;
        for (const p of g.pipes) {
          const px = p.xr * W;
          const pw = PIPE_W * W;
          const gapC = p.gr * H;
          const gapH = GAP_HALF * H;
          if (!p.passed && px + pw < birdXpx - radPx) {
            p.passed = true;
            g.score += 1;
            setScore(g.score);
            sndScore();
          }
          const inX = birdXpx + radPx > px && birdXpx - radPx < px + pw;
          if (inX && (birdYpx - radPx < gapC - gapH || birdYpx + radPx > gapC + gapH)) endGame();
        }
        if (birdYpx + radPx > floorY) {
          g.birdYr = (floorY - radPx) / H;
          endGame();
        }
        if (birdYpx - radPx < 0) g.birdYr = radPx / H;
      } else {
        g.birdYr = 0.5 + Math.sin(g.wing * 0.6) * 0.015;
        g.scroll += SPEED * 0.4 * k;
      }

      // ===== DRAW =====
      const M = 12;
      let sx = 0;
      let sy = 0;
      if (scene.fx === "quake" && g.phase === "playing") {
        sx = (Math.random() - 0.5) * W * 0.014;
        sy = (Math.random() - 0.5) * H * 0.014;
      }
      ctx.save();
      ctx.translate(sx, sy);

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, scene.sky[0]);
      sky.addColorStop(0.6, scene.sky[1]);
      sky.addColorStop(1, scene.sky[2]);
      ctx.fillStyle = sky;
      ctx.fillRect(-M, -M, W + 2 * M, H + 2 * M);

      if (scene.stars) {
        ctx.fillStyle = "#fff";
        for (const st of g.stars) {
          ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(g.wing * 0.5 + st.xr * 10));
          ctx.beginPath();
          ctx.arc(st.xr * W, st.yr * H, st.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      for (const c of g.clouds) {
        let cx = (c.xr - g.scroll * 0.15) % 1.2;
        if (cx < -0.2) cx += 1.4;
        drawCloud(cx * W, c.yr * H, c.sc * (W / 360), scene.cloud);
      }

      // rain fx
      if (scene.fx === "rain") {
        ctx.strokeStyle = "rgba(200,225,255,0.55)";
        ctx.lineWidth = 1.4;
        for (const d of g.rain) {
          d.yr += d.sp * k;
          d.xr -= d.sp * 0.25 * k;
          if (d.yr > 1) {
            d.yr -= 1;
            d.xr = Math.random();
          }
          const x = d.xr * W;
          const y = d.yr * H;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - d.len * W * 0.4, y + d.len * H);
          ctx.stroke();
        }
      }

      // pipes
      const pw = PIPE_W * W;
      for (const p of g.pipes) {
        const px = p.xr * W;
        const gapC = p.gr * H;
        const gapH = GAP_HALF * H;
        const topH = gapC - gapH;
        const botY = gapC + gapH;
        const botH = H - GROUND * H - botY;
        drawSeg(scene.ob.kind, scene.ob.c, scene.ob.accent, px, pw, 0, topH, false);
        drawSeg(scene.ob.kind, scene.ob.c, scene.ob.accent, px, pw, botY, botH, true);
      }

      // volcano embers (in front of pipes)
      if (scene.fx === "volcano") {
        for (const e of g.embers) {
          e.yr -= e.vy * k;
          if (e.yr < 0) {
            e.yr = 1;
            e.xr = Math.random();
          }
          const fl = 0.6 + 0.4 * Math.sin(g.wing * 2 + e.xr * 12);
          ctx.globalAlpha = fl;
          ctx.fillStyle = "#ff7a1e";
          ctx.beginPath();
          ctx.arc(e.xr * W, e.yr * H, e.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // ground
      const gH = H * GROUND;
      const gY = H - gH;
      ctx.fillStyle = scene.ground;
      ctx.fillRect(-M, gY, W + 2 * M, gH + M);
      ctx.fillStyle = scene.groundDark;
      ctx.fillRect(-M, gY, W + 2 * M, gH * 0.18);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      const dashW = W * 0.09;
      const off = (g.scroll * W) % (dashW * 2);
      for (let x = -off; x < W; x += dashW * 2) ctx.fillRect(x, gY + gH * 0.45, dashW, gH * 0.12);
      ctx.fillStyle = scene.groundEdge;
      ctx.fillRect(-M, gY - 3, W + 2 * M, 4);

      // character
      const birdYpx = g.birdYr * H;
      ctx.save();
      ctx.translate(birdXpx, birdYpx);
      const rot = g.phase === "playing" ? Math.max(-0.5, Math.min(1.1, g.velr / (MAX_FALL * 0.9))) : 0;
      ctx.rotate(rot);
      drawChar(radPx, char);
      ctx.restore();

      ctx.restore(); // shake
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [endGame, sndScore]);

  const Controls = ({ dark }: { dark?: boolean }) => (
    <div className="ctrl-row">
      <button
        className={`hud-btn ${dark ? "dark" : ""}`}
        aria-label="Fullscreen"
        onPointerDown={(e) => {
          e.stopPropagation();
          toggleFullscreen();
        }}
      >
        {isFs ? <IconMinimize size={17} /> : <IconMaximize size={17} />}
      </button>
      <button
        className={`hud-btn ${dark ? "dark" : ""}`}
        aria-label={muted ? "Unmute" : "Mute"}
        onPointerDown={(e) => {
          e.stopPropagation();
          toggleMute();
        }}
      >
        {muted ? <IconVolumeOff size={17} /> : <IconVolume size={17} />}
      </button>
    </div>
  );

  return (
    <div className="flappy-wrap">
      <div
        ref={stageRef}
        className="flappy-stage"
        onPointerDown={(e) => {
          if (s.current.phase === "playing") {
            e.preventDefault();
            flap();
          }
        }}
      >
        <canvas ref={canvasRef} className="flappy-canvas" />

        {phase === "playing" && (
          <div className="flappy-hud">
            <div className="hud-score">{score}</div>
            <Controls />
          </div>
        )}

        {phase === "menu" && (
          <div className="flappy-overlay">
            <div className="flappy-panel menu">
              <div className="menu-head">
                <div className="flappy-title">Flappy Bird</div>
                <Controls dark />
              </div>

              <button className="flappy-btn big" onClick={start}>
                <IconPlayerPlay size={20} /> {t("flappy_play")}
              </button>

              <section className="menu-sec">
                <div className="menu-label">
                  <IconTrophy size={14} /> {t("flappy_leaderboard")}
                </div>
                {scores.length === 0 ? (
                  <div className="lb-empty">{t("flappy_no_scores")}</div>
                ) : (
                  <ol className="lb">
                    {scores.slice(0, 3).map((v, i) => (
                      <li key={i} className={`rank-${i + 1}`}>
                        <span className="lb-rank">{i + 1}</span>
                        <span className="lb-val">{v}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="menu-sec">
                <div className="menu-label">{t("flappy_scene")}</div>
                <div className="chip-row">
                  <button
                    className={`chip ${sceneId === "random" ? "active" : ""}`}
                    onClick={() => pickScene("random")}
                  >
                    <span className="swatch rainbow" />
                    {t("flappy_scene_random")}
                  </button>
                  {SCENES.map((sc) => (
                    <button
                      key={sc.id}
                      className={`chip ${sceneId === sc.id ? "active" : ""}`}
                      onClick={() => pickScene(sc.id)}
                    >
                      <span className="swatch" style={{ background: `linear-gradient(${sc.sky[0]}, ${sc.sky[2]})` }} />
                      {t(sc.nameKey as Parameters<typeof t>[0])}
                    </button>
                  ))}
                </div>
              </section>

              <section className="menu-sec">
                <div className="menu-label">{t("flappy_character")}</div>
                <div className="chip-row">
                  {CHARACTERS.map((ch) => (
                    <button
                      key={ch.id}
                      className={`chip ${charId === ch.id ? "active" : ""}`}
                      onClick={() => pickChar(ch.id)}
                    >
                      <span className="dot" style={{ background: `linear-gradient(${ch.body[0]}, ${ch.body[1]})` }} />
                      {t(ch.nameKey as Parameters<typeof t>[0])}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {phase === "over" && (
          <div className="flappy-overlay">
            <div className="flappy-panel">
              <div className="flappy-title">{t("flappy_gameover")}</div>
              {isNewBest && (
                <div className="flappy-newbest">
                  <IconTrophy size={16} /> {t("flappy_new_best")}
                </div>
              )}
              <div className="flappy-scores">
                <div>
                  <span>{t("flappy_score")}</span>
                  <b>{score} </b>
                </div>
                <div>
                  <span>{t("flappy_best")}</span>
                  <b>{best}</b>
                </div>
              </div>
              <div className="over-actions">
                <button className="flappy-btn" onClick={start}>
                  <IconRefresh size={18} /> {t("flappy_restart")}
                </button>
                <button className="flappy-btn ghost" onClick={goMenu}>
                  <IconArrowLeft size={18} /> {t("flappy_menu")}
                </button>
              </div>
              <div className="flappy-hint">{t("flappy_space_continue")}</div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .flappy-wrap {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .flappy-stage {
          position: relative;
          width: 100%;
          max-width: 720px;
          aspect-ratio: 4 / 3;
          max-height: calc(100vh - 220px);
          max-height: calc(100dvh - 220px);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: 0 12px 32px -12px rgba(0, 0, 0, 0.45);
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .flappy-stage:fullscreen {
          max-width: none;
          max-height: none;
          width: 100vw;
          height: 100vh;
          aspect-ratio: auto;
          border-radius: 0;
          border: none;
        }
        .flappy-canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        @media (min-width: 700px) {
          .flappy-stage {
            max-width: 960px;
          }
        }
        @media (min-width: 1024px) {
          .flappy-stage {
            max-width: 1200px;
          }
        }
        @media (min-width: 1440px) {
          .flappy-stage {
            max-width: 1440px;
          }
        }
        @media (max-width: 640px) {
          .flappy-stage {
            aspect-ratio: 3 / 4;
          }
        }
        .flappy-hud {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          pointer-events: none;
        }
        .hud-score {
          font-size: clamp(28px, 9vw, 46px);
          font-weight: 900;
          color: #fff;
          text-shadow:
            0 2px 0 rgba(0, 0, 0, 0.35),
            0 0 8px rgba(0, 0, 0, 0.2);
          line-height: 1;
        }
        .ctrl-row {
          display: flex;
          gap: 8px;
          pointer-events: auto;
        }
        .hud-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.3);
          color: #fff;
          cursor: pointer;
          backdrop-filter: blur(2px);
        }
        .hud-btn.dark {
          background: color-mix(in srgb, var(--text) 12%, transparent);
          color: var(--text);
        }
        .flappy-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
        }
        .flappy-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 22px;
          border-radius: 18px;
          background: color-mix(in srgb, var(--bg) 90%, transparent);
          border: 1px solid var(--border);
          box-shadow: 0 18px 40px -14px rgba(0, 0, 0, 0.5);
          text-align: center;
          max-width: 92%;
          max-height: 100%;
          overflow-y: auto;
        }
        .flappy-panel.menu {
          align-items: stretch;
          width: 340px;
          max-width: 92%;
          gap: 14px;
        }
        .menu-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .flappy-title {
          font-size: 24px;
          font-weight: 900;
          color: var(--text);
        }
        .flappy-newbest {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-weight: 800;
          color: var(--warn);
          font-size: 14px;
        }
        .flappy-hint {
          color: var(--text-dim, var(--text));
          font-size: 13px;
          line-height: 1.5;
        }
        .menu-sec {
          display: flex;
          flex-direction: column;
          gap: 7px;
          text-align: left;
        }
        .menu-label {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-dim, var(--text));
        }
        .chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 11px 6px 7px;
          border: 1.5px solid var(--border);
          border-radius: 999px;
          background: var(--bg-soft, transparent);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition:
            border-color 0.12s,
            transform 0.1s;
        }
        .chip:hover {
          transform: translateY(-1px);
        }
        .chip.active {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
        }
        .swatch {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          border: 1px solid rgba(0, 0, 0, 0.15);
        }
        .swatch.rainbow {
          background: conic-gradient(#ff5757, #ffbd59, #7ed957, #38b6ff, #8c52ff, #ff5757);
        }
        .dot {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.15);
        }
        .lb {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .lb li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          border-radius: 8px;
          background: var(--bg-soft, color-mix(in srgb, var(--text) 5%, transparent));
        }
        .lb-rank {
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: var(--accent);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
        }
        .rank-1 .lb-rank {
          background: #f5b301;
        }
        .rank-2 .lb-rank {
          background: #9aa7b5;
        }
        .rank-3 .lb-rank {
          background: #cd7f32;
        }
        .lb-val {
          font-weight: 800;
          color: var(--text);
        }
        .lb-empty {
          font-size: 13px;
          color: var(--text-dim, var(--text));
          padding: 6px 0;
        }
        .flappy-scores {
          display: flex;
          gap: 22px;
        }
        .flappy-scores > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .flappy-scores span {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-dim, var(--text));
        }
        .flappy-scores b {
          font-size: 28px;
          font-weight: 900;
          color: var(--text);
        }
        .over-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .flappy-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 11px 20px;
          border: none;
          border-radius: 999px;
          background: var(--accent);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.12s ease,
            filter 0.12s ease;
        }
        .flappy-btn.big {
          padding: 13px 22px;
          font-size: 16px;
        }
        .flappy-btn.ghost {
          background: transparent;
          border: 1.5px solid var(--border);
          color: var(--text);
        }
        .flappy-btn:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .flappy-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
