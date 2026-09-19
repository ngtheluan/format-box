"use client";
import { useSkin } from "@/lib/skin-context";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function SkinScene() {
  const { skin } = useSkin();
  const pathname = usePathname();
  const mountRef = useRef<HTMLDivElement>(null);

  // Hide the seasonal theme on every admin route except /admin/theme itself,
  // where preview needs to render.
  const suppress = pathname.startsWith("/admin") && pathname !== "/admin/theme";
  const effectiveSkin = suppress ? "modern" : skin;

  // Also strip the html[data-skin] attribute so accent overrides and gradient
  // backgrounds tied to it don't apply on suppressed routes.
  useEffect(() => {
    if (!suppress) return;
    const prev = document.documentElement.dataset.skin;
    delete document.documentElement.dataset.skin;
    return () => {
      if (prev) document.documentElement.dataset.skin = prev;
    };
  }, [suppress, pathname]);

  useEffect(() => {
    if (effectiveSkin === "modern") return;
    const mount = mountRef.current;
    if (!mount) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });

    const disposables: { dispose: () => void }[] = [];
    let tick: ((t: number) => void) | null = null;
    let onResize: (() => void) | null = null;
    let aspect = 1;

    if (effectiveSkin === "mid-autumn") {
      const T = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      // Half extents of the visible plane at world depth z (follows the viewport aspect).
      const half = (z: number) => {
        const h = T * (camera.position.z - z);
        return { w: h * aspect, h };
      };
      const clamp = THREE.MathUtils.clamp;
      let seed = 20240917;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      const hash = (n: number) => {
        const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
      };
      const TAU = Math.PI * 2;

      const makeTex = (w: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, h = w) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        draw(c.getContext("2d")!, w, h);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        disposables.push(tex);
        return tex;
      };
      const sprite = (map: THREE.Texture, opacity = 1) => {
        const mat = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, opacity });
        disposables.push(mat);
        const spr = new THREE.Sprite(mat);
        scene.add(spr);
        return spr;
      };
      const blob = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer: string, squash = 1) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, squash);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, inner);
        g.addColorStop(1, outer);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.fill();
        ctx.restore();
      };
      const starPath = (ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, r: number) => {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const rad = i % 2 === 0 ? R : r;
          const x = cx + Math.cos(a) * rad;
          const y = cy + Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      // ── Textures ─────────────────────────────────────────────────────────
      const auraTex = makeTex(512, (ctx, s) => {
        const c = s / 2;
        const g = ctx.createRadialGradient(c, c, s / 12, c, c, c);
        g.addColorStop(0, "rgba(255, 228, 160, 0.55)");
        g.addColorStop(0.3, "rgba(255, 205, 120, 0.24)");
        g.addColorStop(0.65, "rgba(255, 170, 90, 0.07)");
        g.addColorStop(1, "rgba(255, 170, 90, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      });

      // Faint lunar corona: a warm ring hugging the moon and a pale violet one further out
      const coronaTex = makeTex(512, (ctx, s) => {
        const c = s / 2;
        const g = ctx.createRadialGradient(c, c, 0, c, c, c);
        g.addColorStop(0, "rgba(255, 228, 165, 0)");
        g.addColorStop(0.4, "rgba(255, 228, 165, 0)");
        g.addColorStop(0.5, "rgba(255, 234, 175, 0.22)");
        g.addColorStop(0.58, "rgba(255, 215, 150, 0.07)");
        g.addColorStop(0.68, "rgba(255, 200, 140, 0)");
        g.addColorStop(0.78, "rgba(214, 190, 255, 0.07)");
        g.addColorStop(0.88, "rgba(255, 190, 140, 0)");
        g.addColorStop(1, "rgba(255, 190, 140, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      });

      const moonTex = makeTex(512, (ctx, s) => {
        const c = s / 2;
        const R = s / 2 - 6;
        ctx.save();
        ctx.beginPath();
        ctx.arc(c, c, R, 0, TAU);
        ctx.clip();
        const base = ctx.createRadialGradient(c - 70, c - 80, 20, c, c, R);
        base.addColorStop(0, "#fffef6");
        base.addColorStop(0.55, "#fff3cf");
        base.addColorStop(1, "#f6cf86");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, s, s);
        // Maria (the dark patches)
        const maria = [
          [0.36, 0.34, 0.16],
          [0.58, 0.3, 0.1],
          [0.5, 0.55, 0.18],
          [0.71, 0.52, 0.09],
          [0.33, 0.63, 0.09],
          [0.62, 0.76, 0.11],
          [0.46, 0.2, 0.07],
        ];
        for (const [u, v, r] of maria) blob(ctx, u * s, v * s, r * s, "rgba(196, 150, 86, 0.34)", "rgba(196, 150, 86, 0)");
        // Small craters: shadowed rim + lit rim
        for (let i = 0; i < 46; i++) {
          const a = rnd() * TAU;
          const d = Math.sqrt(rnd()) * R * 0.9;
          const x = c + Math.cos(a) * d;
          const y = c + Math.sin(a) * d;
          const r = 3 + rnd() * 11;
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = "rgba(170, 120, 60, 0.18)";
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.stroke();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.beginPath();
          ctx.arc(x + 1, y + 1, r, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
        // Warm limb
        const limb = ctx.createRadialGradient(c, c, R * 0.62, c, c, R);
        limb.addColorStop(0, "rgba(230, 160, 70, 0)");
        limb.addColorStop(1, "rgba(230, 150, 60, 0.4)");
        ctx.fillStyle = limb;
        ctx.fillRect(0, 0, s, s);
        ctx.restore();
        ctx.strokeStyle = "rgba(255, 236, 190, 0.6)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c, c, R - 1, 0, TAU);
        ctx.stroke();
      });

      const cloudTex = (tint: string) =>
        makeTex(
          512,
          (ctx, w, h) => {
            ctx.clearRect(0, 0, w, h);
            for (let i = 0; i < 17; i++) {
              const t = i / 16;
              const bulge = Math.sin(t * Math.PI);
              const x = 60 + t * (w - 120);
              const y = h * 0.62 - bulge * h * 0.2 + (rnd() - 0.5) * h * 0.1;
              const r = 38 + bulge * 46 + rnd() * 22;
              blob(ctx, x, y, r, `rgba(${tint}, 0.34)`, `rgba(${tint}, 0)`, 0.55);
            }
          },
          256,
        );

      // Mountain ridgelines shared by the texture and the pagoda placement (v = fraction from the top)
      const ridgeFar = (u: number) => 0.46 + 0.09 * Math.sin(u * 7 + 1) + 0.055 * Math.sin(u * 17 + 2) + 0.025 * Math.sin(u * 37);
      const ridgeNear = (u: number) => 0.6 + 0.07 * Math.sin(u * 5 + 3) + 0.05 * Math.sin(u * 13 + 1) + 0.02 * Math.sin(u * 31);
      const mountainTex = (ridge: (u: number) => number, top: string, bottom: string, forest: boolean) =>
        makeTex(
          2048,
          (ctx, w, h) => {
            const path = () => {
              ctx.beginPath();
              ctx.moveTo(0, h);
              for (let x = 0; x <= w; x += 8) ctx.lineTo(x, ridge(x / w) * h);
              ctx.lineTo(w, h);
              ctx.closePath();
            };
            const fill = ctx.createLinearGradient(0, 0, 0, h);
            fill.addColorStop(0, top);
            fill.addColorStop(1, bottom);
            path();
            ctx.fillStyle = fill;
            ctx.fill();
            // Moonlit rim along the ridge
            ctx.beginPath();
            for (let x = 0; x <= w; x += 8) {
              const y = ridge(x / w) * h;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = "rgba(255, 214, 150, 0.32)";
            ctx.lineWidth = 2.5;
            ctx.stroke();
            if (forest) {
              ctx.fillStyle = bottom;
              for (let x = 6; x < w; x += 22 + rnd() * 26) {
                const y = ridge(x / w) * h + 4;
                const th = 16 + rnd() * 26;
                const tw = 7 + rnd() * 7;
                ctx.beginPath();
                ctx.moveTo(x, y - th);
                ctx.lineTo(x - tw, y);
                ctx.lineTo(x + tw, y);
                ctx.closePath();
                ctx.fill();
              }
            }
          },
          512,
        );
      const farTex = mountainTex(ridgeFar, "rgba(96, 52, 118, 0.62)", "rgba(44, 20, 66, 0.88)", false);
      const nearTex = mountainTex(ridgeNear, "rgba(48, 22, 60, 0.88)", "rgba(20, 8, 32, 0.96)", true);

      // Five-tier pagoda with lit windows
      const pagodaTex = makeTex(
        256,
        (ctx, w) => {
          const cx = w / 2;
          ctx.fillStyle = "rgba(24, 10, 38, 0.94)";
          ctx.fillRect(cx - 62, 490, 124, 14);
          let roofTop = 0;
          for (let i = 0; i < 5; i++) {
            const bw = 120 - i * 18;
            const bh = 46;
            const bottom = 490 - i * 80;
            const roofY = bottom - bh;
            ctx.fillStyle = "rgba(24, 10, 38, 0.94)";
            ctx.fillRect(cx - bw / 2, roofY, bw, bh);
            const rw = bw / 2 + 22;
            ctx.beginPath();
            ctx.moveTo(cx - rw, roofY + 4);
            ctx.quadraticCurveTo(cx - rw * 0.45, roofY + 10, cx - bw * 0.3, roofY - 22);
            ctx.lineTo(cx + bw * 0.3, roofY - 22);
            ctx.quadraticCurveTo(cx + rw * 0.45, roofY + 10, cx + rw, roofY + 4);
            ctx.quadraticCurveTo(cx, roofY + 20, cx - rw, roofY + 4);
            ctx.closePath();
            ctx.fill();
            ctx.save();
            ctx.shadowColor = "rgba(255, 190, 100, 0.9)";
            ctx.shadowBlur = 10;
            ctx.fillStyle = "rgba(255, 200, 120, 0.95)";
            for (const k of [-1, 0, 1]) ctx.fillRect(cx + k * bw * 0.28 - 3, roofY + 14, 6, 16);
            ctx.restore();
            roofTop = roofY - 22;
          }
          ctx.fillStyle = "rgba(24, 10, 38, 0.94)";
          ctx.fillRect(cx - 2, roofTop - 62, 4, 64);
          ctx.beginPath();
          ctx.arc(cx, roofTop - 62, 6, 0, TAU);
          ctx.fill();
        },
        512,
      );

      const mistTex = makeTex(
        512,
        (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          for (let i = 0; i <= 10; i++) blob(ctx, (i / 10) * w, h / 2 + (rnd() - 0.5) * 20, 50 + rnd() * 34, "rgba(255, 224, 200, 0.24)", "rgba(255, 224, 200, 0)", 0.5);
        },
        128,
      );

      const dotTex = makeTex(64, (ctx, s) => {
        const c = s / 2;
        const g = ctx.createRadialGradient(c, c, 0, c, c, c);
        g.addColorStop(0, "rgba(255, 253, 232, 1)");
        g.addColorStop(0.3, "rgba(255, 232, 165, 0.7)");
        g.addColorStop(1, "rgba(255, 200, 100, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      });
      const fireTex = makeTex(64, (ctx, s) => {
        const c = s / 2;
        const g = ctx.createRadialGradient(c, c, 0, c, c, c);
        g.addColorStop(0, "rgba(255, 246, 170, 1)");
        g.addColorStop(0.3, "rgba(255, 214, 96, 0.55)");
        g.addColorStop(1, "rgba(255, 190, 70, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      });

      // Four-point twinkle
      const flareTex = makeTex(128, (ctx, s) => {
        const c = s / 2;
        blob(ctx, c, c, c * 0.5, "rgba(255, 246, 215, 0.85)", "rgba(255, 230, 170, 0)");
        for (const rot of [0, Math.PI / 2]) {
          ctx.save();
          ctx.translate(c, c);
          ctx.rotate(rot);
          ctx.scale(1, 0.07);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c);
          g.addColorStop(0, "rgba(255, 250, 232, 1)");
          g.addColorStop(1, "rgba(255, 230, 170, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, c, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      });

      // Traditional star lantern (đèn ông sao) with a streamer tail
      const starLanternTex = makeTex(
        256,
        (ctx, w, h) => {
          const cx = w / 2;
          const cy = 138;
          const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 128);
          glow.addColorStop(0, "rgba(255, 120, 70, 0.55)");
          glow.addColorStop(0.5, "rgba(255, 90, 50, 0.16)");
          glow.addColorStop(1, "rgba(255, 90, 50, 0)");
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = "rgba(255, 210, 130, 0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, cy - 92);
          ctx.stroke();
          const body = ctx.createRadialGradient(cx - 14, cy - 22, 6, cx, cy, 100);
          body.addColorStop(0, "#ff9c7a");
          body.addColorStop(0.5, "#ea3a30");
          body.addColorStop(1, "#a01414");
          starPath(ctx, cx, cy, 96, 44);
          ctx.fillStyle = body;
          ctx.fill();
          ctx.lineJoin = "round";
          ctx.strokeStyle = "rgba(255, 224, 130, 0.8)";
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.strokeStyle = "rgba(255, 224, 130, 0.42)";
          ctx.lineWidth = 2;
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i * TAU) / 5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * 92, cy + Math.sin(a) * 92);
            ctx.stroke();
          }
          const core = ctx.createRadialGradient(cx, cy, 2, cx, cy, 40);
          core.addColorStop(0, "rgba(255, 246, 190, 0.95)");
          core.addColorStop(1, "rgba(255, 210, 110, 0.15)");
          starPath(ctx, cx, cy, 44, 20);
          ctx.fillStyle = core;
          ctx.fill();
          // Tail
          for (let k = -2; k <= 2; k++) {
            const x = cx + k * 10;
            const len = 62 - Math.abs(k) * 9;
            ctx.fillStyle = k % 2 === 0 ? "#ffd54f" : "#e53935";
            ctx.beginPath();
            ctx.moveTo(x - 4, cy + 70);
            ctx.lineTo(x + 4, cy + 70);
            ctx.lineTo(x, cy + 70 + len);
            ctx.closePath();
            ctx.fill();
          }
        },
        300,
      );

      const roundLanternTex = (hue: number) =>
        makeTex(256, (ctx, s) => {
          const cx = s / 2;
          const glow = ctx.createRadialGradient(cx, cx, 20, cx, cx, s / 2);
          glow.addColorStop(0, `hsla(${hue}, 95%, 65%, 0.5)`);
          glow.addColorStop(0.4, `hsla(${hue}, 90%, 55%, 0.18)`);
          glow.addColorStop(1, `hsla(${hue}, 90%, 50%, 0)`);
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, s, s);
          ctx.save();
          ctx.translate(cx, cx);
          ctx.scale(0.82, 1);
          const bg = ctx.createRadialGradient(-24, -32, 6, 0, 0, 82);
          bg.addColorStop(0, `hsl(${hue}, 100%, 78%)`);
          bg.addColorStop(0.55, `hsl(${hue}, 88%, 52%)`);
          bg.addColorStop(1, `hsl(${hue}, 82%, 34%)`);
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(0, 0, 78, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = `hsla(${hue}, 100%, 92%, 0.55)`;
          ctx.lineWidth = 2;
          for (let i = -2; i <= 2; i++) {
            const off = i * 20;
            ctx.beginPath();
            ctx.moveTo(off, -76);
            ctx.bezierCurveTo(off + Math.sign(i) * 8, -30, off + Math.sign(i) * 8, 30, off, 76);
            ctx.stroke();
          }
          ctx.restore();
          ctx.fillStyle = "#3a1c0e";
          ctx.fillRect(cx - 32, cx - 92, 64, 12);
          ctx.fillRect(cx - 32, cx + 80, 64, 12);
          ctx.fillStyle = "#5a2a14";
          ctx.fillRect(cx - 26, cx - 96, 52, 6);
          ctx.fillRect(cx - 26, cx + 90, 52, 6);
          ctx.strokeStyle = "rgba(255, 200, 120, 0.55)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cx - 96);
          ctx.lineTo(cx, 0);
          ctx.stroke();
          ctx.strokeStyle = "#f4c94a";
          ctx.lineWidth = 2;
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 4, cx + 96);
            ctx.lineTo(cx + i * 2, cx + 122);
            ctx.stroke();
          }
          ctx.fillStyle = "#c9832b";
          ctx.beginPath();
          ctx.arc(cx, cx + 96, 5, 0, TAU);
          ctx.fill();
        });

      // Rising sky lantern (đèn trời)
      const skyTex = makeTex(
        128,
        (ctx, w) => {
          const cx = w / 2;
          blob(ctx, cx, 88, 64, "rgba(255, 176, 80, 0.6)", "rgba(255, 150, 60, 0)");
          const body = ctx.createLinearGradient(0, 40, 0, 114);
          body.addColorStop(0, "#ffe9a8");
          body.addColorStop(1, "#ff9a3c");
          ctx.fillStyle = body;
          ctx.beginPath();
          ctx.moveTo(cx - 30, 42);
          ctx.lineTo(cx + 30, 42);
          ctx.lineTo(cx + 23, 114);
          ctx.lineTo(cx - 23, 114);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#fff0bd";
          ctx.beginPath();
          ctx.ellipse(cx, 42, 30, 7, 0, 0, TAU);
          ctx.fill();
          blob(ctx, cx, 116, 18, "rgba(255, 252, 220, 1)", "rgba(255, 190, 80, 0)");
        },
        160,
      );

      const mooncakeTex = makeTex(256, (ctx, s) => {
        const cx = s / 2;
        const outer = ctx.createRadialGradient(cx - 22, cx - 22, 10, cx, cx, 112);
        outer.addColorStop(0, "#e0a558");
        outer.addColorStop(0.65, "#a9631f");
        outer.addColorStop(1, "#5b2f0e");
        ctx.fillStyle = outer;
        ctx.beginPath();
        ctx.arc(cx, cx, 110, 0, TAU);
        ctx.fill();
        for (let k = 0; k < 20; k++) {
          const a = (k / 20) * TAU;
          blob(ctx, cx + Math.cos(a) * 104, cx + Math.sin(a) * 104, 12, "rgba(90, 45, 15, 0.55)", "rgba(90, 45, 15, 0)");
        }
        const top = ctx.createRadialGradient(cx - 18, cx - 22, 8, cx, cx, 92);
        top.addColorStop(0, "#f2c47a");
        top.addColorStop(1, "#b87528");
        ctx.fillStyle = top;
        ctx.beginPath();
        ctx.arc(cx, cx, 90, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(107, 55, 18, 0.85)";
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU;
          ctx.save();
          ctx.translate(cx + Math.cos(a) * 32, cx + Math.sin(a) * 32);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 8, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = "#6b3712";
        ctx.beginPath();
        ctx.arc(cx, cx, 16, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#f4d18a";
        ctx.beginPath();
        ctx.arc(cx - 4, cx - 4, 5, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(80, 40, 15, 0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cx, 90, 0, TAU);
        ctx.stroke();
      });

      // Head on the left, fading tail to the right
      const streakTex = makeTex(
        256,
        (ctx, w, h) => {
          const g = ctx.createLinearGradient(0, 0, w, 0);
          g.addColorStop(0, "rgba(255, 252, 235, 1)");
          g.addColorStop(0.08, "rgba(255, 240, 190, 0.85)");
          g.addColorStop(1, "rgba(255, 220, 150, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, h * 0.25);
          ctx.lineTo(0, h * 0.75);
          ctx.lineTo(w, h * 0.5);
          ctx.closePath();
          ctx.fill();
          blob(ctx, 7, h / 2, 8, "rgba(255, 255, 240, 1)", "rgba(255, 240, 190, 0)");
        },
        16,
      );

      // ── Sky: stars + twinkle flares ──────────────────────────────────────
      const starGroups = [
        { n: 110, size: 0.28, f: 1.1, color: 0xffffff },
        { n: 70, size: 0.4, f: 1.7, color: 0xffffff },
        { n: 36, size: 0.55, f: 0.8, color: 0xfff1c9 },
      ].map((cfg) => {
        const uv = new Float32Array(cfg.n * 2);
        for (let i = 0; i < cfg.n; i++) {
          uv[i * 2] = rnd() * 2 - 1;
          uv[i * 2 + 1] = rnd() * 1.3 - 0.3;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(cfg.n * 3), 3));
        const mat = new THREE.PointsMaterial({ map: dotTex, size: cfg.size, color: cfg.color, transparent: true, opacity: 0.8, depthWrite: false });
        const pts = new THREE.Points(geo, mat);
        pts.frustumCulled = false;
        scene.add(pts);
        disposables.push(geo, mat);
        return { ...cfg, uv, geo, mat, ph: rnd() * TAU };
      });
      const flares = Array.from({ length: 9 }, () => ({
        spr: sprite(flareTex, 0.9),
        u: rnd() * 2 - 1,
        v: rnd() * 1.05 - 0.1,
        size: 0.9 + rnd() * 1.1,
        f: 0.7 + rnd() * 1.1,
        ph: rnd() * TAU,
      }));

      const shooter = sprite(streakTex, 0);
      shooter.material.rotation = 0.5;

      // ── Moon ─────────────────────────────────────────────────────────────
      const aura = sprite(auraTex);
      const corona = sprite(coronaTex, 0.9);
      const moon = sprite(moonTex);
      let moonS = 8;
      let moonX = 0;
      let moonY = 0;

      // ── Clouds ───────────────────────────────────────────────────────────
      const tints = ["255, 226, 170", "214, 192, 238", "255, 210, 160"];
      const clouds = Array.from({ length: 6 }, (_, i) => {
        const w = 14 + rnd() * 10;
        return {
          spr: sprite(cloudTex(tints[i % tints.length]), 0.5 + rnd() * 0.25),
          w,
          z: -13 + rnd() * 1.4,
          y: 0.05 + rnd() * 0.75,
          speed: 0.15 + rnd() * 0.25,
          off: rnd(),
        };
      });

      // ── Landscape ────────────────────────────────────────────────────────
      const farMt = sprite(farTex, 0.95);
      const pagoda = sprite(pagodaTex, 0.95);
      const mistA = sprite(mistTex, 0.55);
      const nearMt = sprite(nearTex);
      const mistB = sprite(mistTex, 0.4);

      // ── Hanging garland: catenary string + fairy lights + swaying lanterns ──
      const GN = 48;
      const garlandGeo = new THREE.BufferGeometry();
      garlandGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(GN * 3), 3));
      const garlandMat = new THREE.LineBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.5 });
      const garland = new THREE.Line(garlandGeo, garlandMat);
      garland.frustumCulled = false;
      scene.add(garland);
      disposables.push(garlandGeo, garlandMat);

      const FN = 24;
      const fairyGeo = new THREE.BufferGeometry();
      fairyGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(FN * 3), 3));
      const fairyMat = new THREE.PointsMaterial({ map: fireTex, size: 0.42, color: 0xffe2a0, transparent: true, opacity: 0.85, depthWrite: false });
      const fairy = new THREE.Points(fairyGeo, fairyMat);
      fairy.frustumCulled = false;
      scene.add(fairy);
      disposables.push(fairyGeo, fairyMat);

      const roundTex = new Map<number, THREE.Texture>();
      const lanternSpecs: { star: boolean; hue: number; u: number; len: number; size: number }[] = [
        { star: true, hue: 0, u: 0.05, len: 1.2, size: 2.5 },
        { star: false, hue: 355, u: 0.19, len: 2.1, size: 2.3 },
        { star: true, hue: 0, u: 0.33, len: 1.5, size: 2.7 },
        { star: false, hue: 38, u: 0.48, len: 2.3, size: 2.2 },
        { star: true, hue: 0, u: 0.63, len: 1.3, size: 2.5 },
        { star: false, hue: 12, u: 0.78, len: 2.0, size: 2.3 },
        { star: true, hue: 0, u: 0.93, len: 1.6, size: 2.6 },
      ];
      const hangers = lanternSpecs.map((sp) => {
        let map: THREE.Texture;
        if (sp.star) map = starLanternTex;
        else {
          map = roundTex.get(sp.hue) ?? roundLanternTex(sp.hue);
          roundTex.set(sp.hue, map);
        }
        return { ...sp, spr: sprite(map), ratio: sp.star ? 300 / 256 : 1, ph: rnd() * TAU, ax: 0, ay: 0, sc: 1 };
      });
      const stringGeo = new THREE.BufferGeometry();
      stringGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(hangers.length * 6), 3));
      const stringMat = new THREE.LineBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.55 });
      const strings = new THREE.LineSegments(stringGeo, stringMat);
      strings.frustumCulled = false;
      scene.add(strings);
      disposables.push(stringGeo, stringMat);

      // ── Rising sky lanterns, fireflies, mooncakes ────────────────────────
      const skyLanterns = Array.from({ length: 14 }, () => ({
        spr: sprite(skyTex, 0),
        u: rnd() * 2 - 1,
        z: -8.4 + rnd() * 5.4,
        size: 0.9 + rnd() * 0.9,
        speed: 0.22 + rnd() * 0.3,
        off: rnd(),
        ph: rnd() * TAU,
      }));
      const fireflies = Array.from({ length: 22 }, () => ({
        spr: sprite(fireTex, 0),
        u: rnd() * 2 - 1,
        v: -1 + rnd() * 0.9,
        z: -5 + rnd() * 4,
        size: 0.35 + rnd() * 0.5,
        ph: rnd() * TAU,
      }));
      const mooncakes = [-0.86, -0.62, 0.82].map((u, i) => ({
        spr: sprite(mooncakeTex),
        u,
        size: 1.5 + i * 0.15,
        ph: rnd() * TAU,
      }));

      // ── Layout (depends on viewport aspect) and animation (pure function of t) ──
      let lastT = 0;
      const layout = () => {
        const sky = half(-16);
        for (const g of starGroups) {
          const arr = g.geo.attributes.position.array as Float32Array;
          for (let i = 0; i < g.n; i++) {
            arr[i * 3] = g.uv[i * 2] * sky.w * 1.08;
            arr[i * 3 + 1] = g.uv[i * 2 + 1] * sky.h;
            arr[i * 3 + 2] = -16;
          }
          g.geo.attributes.position.needsUpdate = true;
        }
        const fl = half(-15.5);
        for (const f of flares) {
          f.spr.position.set(f.u * fl.w, f.v * fl.h, -15.5);
          f.spr.scale.setScalar(f.size);
        }

        const m = half(-14);
        moonS = clamp(Math.min(m.w, m.h) * 0.62, 4, 10.5);
        moonX = Math.min(m.w * 0.6, m.w - moonS * 0.62);
        moonY = m.h * 0.56;
        moon.scale.setScalar(moonS);
        moon.position.set(moonX, moonY, -14);
        corona.scale.setScalar(moonS * 2.3);
        corona.position.set(moonX, moonY, -14.5);
        aura.position.set(moonX, moonY, -14.6);

        const far = half(-11);
        const farH = far.h * 2 * 0.34;
        const farW = far.w * 2 * 1.12;
        farMt.scale.set(farW, farH, 1);
        farMt.position.set(0, -far.h + farH / 2, -11);
        const pH = far.h * 2 * 0.17;
        const px = far.w * 0.5;
        const ridgeY = -far.h + farH - ridgeFar((px + farW / 2) / farW) * farH;
        pagoda.scale.set(pH * 0.5, pH, 1);
        pagoda.position.set(px, ridgeY + pH * 0.47, -10.9);

        const mA = half(-10.4);
        mistA.scale.set(mA.w * 2 * 1.3, mA.h * 2 * 0.2, 1);
        mistA.position.set(0, -mA.h + mA.h * 2 * 0.2, -10.4);
        const near = half(-9);
        const nearH = near.h * 2 * 0.27;
        nearMt.scale.set(near.w * 2 * 1.12, nearH, 1);
        nearMt.position.set(0, -near.h + nearH / 2, -9);
        const mB = half(-8.6);
        mistB.scale.set(mB.w * 2 * 1.3, mB.h * 2 * 0.18, 1);
        mistB.position.set(0, -mB.h + mB.h * 2 * 0.1, -8.6);

        // Garland
        const gz = -2;
        const g = half(gz);
        const sc = clamp(g.w / 12, 0.6, 1);
        const x0 = -g.w * 1.05;
        const x1 = g.w * 0.32;
        const topY = g.h;
        const sag = g.h * 0.14;
        const at = (u: number) => [x0 + (x1 - x0) * u, topY - sag * 4 * u * (1 - u)] as const;
        const gp = garlandGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < GN; i++) {
          const [x, y] = at(i / (GN - 1));
          gp.set([x, y, gz], i * 3);
        }
        garlandGeo.attributes.position.needsUpdate = true;
        const fp = fairyGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < FN; i++) {
          const [x, y] = at((i + 0.5) / FN);
          fp.set([x, y - 0.1, gz + 0.05], i * 3);
        }
        fairyGeo.attributes.position.needsUpdate = true;
        for (const h of hangers) {
          const [x, y] = at(h.u);
          h.ax = x;
          h.ay = y;
          h.sc = sc;
          h.spr.scale.set(h.size * sc, h.size * sc * h.ratio, 1);
        }

        const mc = half(-2);
        for (const c of mooncakes) {
          c.spr.scale.setScalar(c.size * sc);
          c.spr.position.set(c.u * mc.w, -mc.h * 0.82, -2);
        }
      };

      const frame = (t: number) => {
        lastT = t;
        for (const g of starGroups) g.mat.opacity = 0.5 + 0.4 * Math.sin(t * g.f + g.ph);
        for (const f of flares) {
          const k = 0.5 + 0.5 * Math.sin(t * f.f + f.ph);
          f.spr.material.opacity = 0.15 + 0.85 * k * k;
          f.spr.scale.setScalar(f.size * (0.7 + 0.3 * k));
          f.spr.material.rotation = t * 0.05 + f.ph;
        }

        // Shooting star: one every 9s (70% of slots), pure function of the slot index
        const slot = Math.floor(t / 9);
        const local = t - slot * 9;
        if (hash(slot) > 0.3 && local < 1.2) {
          const sk = half(-15);
          const theta = 0.5;
          const dx = -Math.cos(theta);
          const dy = -Math.sin(theta);
          const len = 7;
          const hx = sk.w * (hash(slot + 1) * 1.2 - 0.1);
          const hy = sk.h * (0.35 + hash(slot + 2) * 0.55);
          const travel = (local / 1.2) * 14;
          shooter.position.set(hx + dx * travel - (dx * len) / 2, hy + dy * travel - (dy * len) / 2, -15);
          shooter.scale.set(len, 0.4, 1);
          shooter.material.rotation = theta;
          shooter.material.opacity = Math.sin((local / 1.2) * Math.PI);
        } else {
          shooter.material.opacity = 0;
        }

        const breath = Math.sin(t * 0.5);
        moon.position.y = moonY + Math.sin(t * 0.2) * 0.12;
        aura.scale.setScalar(moonS * 2.9 * (1 + breath * 0.03));
        aura.material.opacity = 0.85 + breath * 0.1;
        corona.material.opacity = 0.75 + Math.sin(t * 0.35 + 1) * 0.2;

        for (const c of clouds) {
          const h = half(c.z);
          const range = h.w * 2 + c.w * 2;
          c.spr.scale.set(c.w, c.w * 0.42, 1);
          c.spr.position.set(((c.off * range + t * c.speed) % range) - range / 2, c.y * h.h, c.z);
        }
        mistA.position.x = Math.sin(t * 0.05) * half(-10.4).w * 0.08;
        mistB.position.x = Math.sin(t * 0.04 + 2) * half(-8.6).w * 0.1;

        // Garland lanterns swing from their anchors
        const sp = stringGeo.attributes.position.array as Float32Array;
        hangers.forEach((h, i) => {
          const a = Math.sin(t * 0.8 + h.ph) * 0.09 + Math.sin(t * 0.37 + h.ph * 2) * 0.04;
          const len = h.len * h.sc;
          const spriteH = h.size * h.sc * h.ratio;
          const dx = Math.sin(a);
          const dy = -Math.cos(a);
          h.spr.position.set(h.ax + dx * (len + spriteH / 2), h.ay + dy * (len + spriteH / 2), -2);
          h.spr.material.rotation = a;
          h.spr.material.opacity = 0.93 + Math.sin(t * 2.1 + h.ph) * 0.07;
          sp.set([h.ax, h.ay, -2, h.ax + dx * len, h.ay + dy * len, -2], i * 6);
        });
        stringGeo.attributes.position.needsUpdate = true;
        fairyMat.opacity = 0.7 + Math.sin(t * 2.4) * 0.2;

        for (const l of skyLanterns) {
          const h = half(l.z);
          const range = h.h * 2 + 3;
          const p = (((t * l.speed) / range + l.off) % 1 + 1) % 1;
          l.spr.position.set(l.u * h.w + Math.sin(t * 0.35 + l.ph) * 0.6, -h.h - 1.5 + p * range, l.z);
          l.spr.scale.set(l.size, l.size * 1.25, 1);
          l.spr.material.opacity = clamp(Math.min(p / 0.1, (1 - p) / 0.15), 0, 1) * (0.85 + 0.15 * Math.sin(t * 6 + l.ph * 3)) * 0.95;
          l.spr.material.rotation = Math.sin(t * 0.5 + l.ph) * 0.06;
        }
        for (const f of fireflies) {
          const h = half(f.z);
          f.spr.position.set(f.u * h.w + Math.sin(t * 0.5 + f.ph) * 1.2 + Math.sin(t * 1.1 + f.ph * 2) * 0.3, f.v * h.h + Math.cos(t * 0.4 + f.ph * 1.3) * 0.9, f.z);
          const k = 0.5 + 0.5 * Math.sin(t * 1.4 + f.ph * 2);
          f.spr.material.opacity = 0.15 + 0.85 * k * k;
          f.spr.scale.setScalar(f.size * (0.8 + 0.4 * k));
        }
        const mcY = -half(-2).h * 0.82;
        for (const c of mooncakes) {
          c.spr.position.y = mcY + Math.sin(t * 0.4 + c.ph) * 0.35;
          c.spr.material.rotation = Math.sin(t * 0.3 + c.ph) * 0.25;
        }
      };

      const pointer = { x: 0, y: 0 };
      onResize = () => {
        layout();
        frame(lastT);
      };
      tick = (t) => {
        frame(t);
        // Gentle parallax: the camera drifts toward the pointer, so near layers move more than far ones
        camera.position.x += (pointer.x * 0.8 - camera.position.x) * 0.04;
        camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.04;
      };
      if (!reduce) {
        const onMove = (e: PointerEvent) => {
          pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
          pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        disposables.push({ dispose: () => window.removeEventListener("pointermove", onMove) });
      }
    } else if (effectiveSkin === "christmas") {
      const N = 500;
      const pos = new Float32Array(N * 3);
      const speeds = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 60;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
        speeds[i] = 1 + Math.random() * 2;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.85, sizeAttenuation: true });
      const snow = new THREE.Points(g, mat);
      scene.add(snow);
      disposables.push(g, mat);

      const starGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xc62828, transparent: true, opacity: 0.6 });
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(-10, 7, -4);
      scene.add(star);
      disposables.push(starGeo, starMat);

      tick = (t) => {
        const arr = g.attributes.position.array as Float32Array;
        for (let i = 0; i < N; i++) {
          arr[i * 3 + 1] -= 0.03 * speeds[i];
          arr[i * 3] += Math.sin(t + i) * 0.004;
          if (arr[i * 3 + 1] < -20) arr[i * 3 + 1] = 20;
        }
        g.attributes.position.needsUpdate = true;
        star.scale.setScalar(1 + Math.sin(t * 1.2) * 0.1);
      };
    } else if (effectiveSkin === "lunar-new-year") {
      const N = 60;
      const envs: THREE.Mesh[] = [];
      const envGeo = new THREE.PlaneGeometry(0.9, 1.2);
      disposables.push(envGeo);
      for (let i = 0; i < N; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xf4b400 : 0xd32f2f, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        disposables.push(mat);
        const m = new THREE.Mesh(envGeo, mat);
        m.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 15);
        m.rotation.z = Math.random() * Math.PI;
        scene.add(m);
        envs.push(m);
      }
      const S = 400;
      const sPos = new Float32Array(S * 3);
      for (let i = 0; i < S; i++) {
        sPos[i * 3] = (Math.random() - 0.5) * 50;
        sPos[i * 3 + 1] = (Math.random() - 0.5) * 30;
        sPos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
      const sm = new THREE.PointsMaterial({ color: 0xffd54f, size: 0.09, transparent: true, opacity: 0.9 });
      const spark = new THREE.Points(sg, sm);
      scene.add(spark);
      disposables.push(sg, sm);

      tick = (t) => {
        envs.forEach((m, i) => {
          m.position.y += 0.015 + (i % 5) * 0.003;
          m.position.x += Math.sin(t * 0.5 + i) * 0.006;
          m.rotation.z += 0.003;
          if (m.position.y > 18) m.position.y = -18;
        });
        spark.rotation.z = t * 0.03;
        sm.opacity = 0.7 + Math.sin(t * 2) * 0.2;
      };
    } else if (effectiveSkin === "halloween") {
      const moonGeo = new THREE.CircleGeometry(2.8, 48);
      const moonMat = new THREE.MeshBasicMaterial({ color: 0xef6c00, transparent: true, opacity: 0.85 });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(-9, 6, -4);
      scene.add(moon);
      disposables.push(moonGeo, moonMat);

      const N = 300;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 60;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0x6a1b9a, size: 0.16, transparent: true, opacity: 0.55 });
      const mist = new THREE.Points(g, mat);
      scene.add(mist);
      disposables.push(g, mat);

      const bats: { mesh: THREE.Mesh; phase: number; speed: number; y: number }[] = [];
      const batShape = new THREE.Shape();
      batShape.moveTo(0, 0);
      batShape.lineTo(0.6, 0.25);
      batShape.lineTo(0.35, -0.05);
      batShape.lineTo(0.9, -0.2);
      batShape.lineTo(0, -0.15);
      batShape.lineTo(-0.9, -0.2);
      batShape.lineTo(-0.35, -0.05);
      batShape.lineTo(-0.6, 0.25);
      batShape.lineTo(0, 0);
      const batGeo = new THREE.ShapeGeometry(batShape);
      disposables.push(batGeo);
      for (let i = 0; i < 8; i++) {
        const m = new THREE.MeshBasicMaterial({ color: 0x1a0e1f, transparent: true, opacity: 0.9 });
        disposables.push(m);
        const bat = new THREE.Mesh(batGeo, m);
        bat.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 15, -2);
        bat.scale.setScalar(0.7 + Math.random() * 0.6);
        scene.add(bat);
        bats.push({ mesh: bat, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.4, y: bat.position.y });
      }

      tick = (t) => {
        moon.scale.setScalar(1 + Math.sin(t * 0.8) * 0.03);
        mist.rotation.z = Math.sin(t * 0.2) * 0.1;
        bats.forEach((b, i) => {
          b.mesh.position.x += b.speed * 0.06;
          if (b.mesh.position.x > 20) b.mesh.position.x = -20;
          b.mesh.position.y = b.y + Math.sin(t * 2 + b.phase) * 0.8;
          b.mesh.scale.y = (0.7 + i * 0.05) * (1 + Math.sin(t * 8 + b.phase) * 0.3);
        });
      };
    }

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      aspect = w / h || 1;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      onResize?.();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const t = clock.getElapsedTime();
      if (!reduce && tick) tick(t);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      disposables.forEach((d) => {
        try {
          d.dispose();
        } catch {}
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [effectiveSkin]);

  if (effectiveSkin === "modern") return null;
  return <div ref={mountRef} className={`skin-scene skin-scene-${effectiveSkin}`} aria-hidden="true" />;
}
