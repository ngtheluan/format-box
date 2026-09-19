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

    let dotCache: THREE.Texture | null = null;
    const softDot = () =>
      (dotCache ??= makeTex(64, (ctx, s) => {
        const c = s / 2;
        const g = ctx.createRadialGradient(c, c, 0, c, c, c);
        g.addColorStop(0, "rgba(255, 255, 255, 1)");
        g.addColorStop(0.35, "rgba(255, 255, 255, 0.7)");
        g.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      }));
    // Points sort by their own z, so each layer sits at its depth and keeps local z = 0
    const makePoints = (n: number, size: number, color: number, z: number, map: THREE.Texture, opacity = 1) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const mat = new THREE.PointsMaterial({ map, size, color, transparent: true, opacity, depthWrite: false });
      const pts = new THREE.Points(geo, mat);
      pts.position.z = z;
      pts.frustumCulled = false;
      scene.add(pts);
      disposables.push(geo, mat);
      return { geo, mat, pts, arr: geo.attributes.position.array as Float32Array };
    };
    // Gentle parallax: the camera drifts toward the pointer, so near layers move more than far ones
    const pointer = { x: 0, y: 0 };
    if (!reduce) {
      const onMove = (e: PointerEvent) => {
        pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      disposables.push({ dispose: () => window.removeEventListener("pointermove", onMove) });
    }
    const parallax = () => {
      camera.position.x += (pointer.x * 0.8 - camera.position.x) * 0.04;
      camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.04;
    };

    if (effectiveSkin === "mid-autumn") {
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
        pts.position.z = -16;
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
      fairy.position.z = -2;
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
            arr[i * 3 + 2] = 0;
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
          fp.set([x, y - 0.1, 0], i * 3);
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

      onResize = () => {
        layout();
        frame(lastT);
      };
      tick = (t) => {
        frame(t);
        parallax();
      };
    } else if (effectiveSkin === "christmas") {
      const dot = softDot();

      // Eight-ray star (Star of Bethlehem / tree topper)
      const rayStarTex = makeTex(512, (ctx, s) => {
        const c = s / 2;
        blob(ctx, c, c, c * 0.55, "rgba(255, 236, 170, 0.8)", "rgba(255, 210, 120, 0)");
        [1, 0.6, 1, 0.6].forEach((len, i) => {
          ctx.save();
          ctx.translate(c, c);
          ctx.rotate((i * Math.PI) / 4);
          ctx.scale(1, 0.05);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c * len);
          g.addColorStop(0, "rgba(255, 252, 235, 1)");
          g.addColorStop(1, "rgba(255, 226, 150, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, c * len, 0, TAU);
          ctx.fill();
          ctx.restore();
        });
      });

      const ridgeFar = (u: number) => 0.5 + 0.07 * Math.sin(u * 4 + 1) + 0.045 * Math.sin(u * 11 + 2) + 0.02 * Math.sin(u * 23);
      const ridgeNear = (u: number) => 0.5 + 0.09 * Math.sin(u * 3 + 4) + 0.04 * Math.sin(u * 8) + 0.015 * Math.sin(u * 21);
      const hillTex = (ridge: (u: number) => number, top: string, bottom: string, pines: boolean) =>
        makeTex(
          2048,
          (ctx, w, h) => {
            const trace = () => {
              ctx.beginPath();
              ctx.moveTo(0, h);
              for (let x = 0; x <= w; x += 8) ctx.lineTo(x, ridge(x / w) * h);
              ctx.lineTo(w, h);
              ctx.closePath();
            };
            if (pines) {
              // Distant forest sits behind the ridge
              for (let x = 4; x < w; x += 12 + rnd() * 22) {
                const base = ridge(x / w) * h + 10;
                const th = 30 + rnd() * 52;
                const tw = 9 + th * 0.2;
                ctx.fillStyle = "rgba(14, 46, 62, 0.92)";
                for (let k = 0; k < 3; k++) {
                  const y0 = base - th * (0.34 * k + 0.34);
                  const y1 = base - th * 0.34 * k;
                  ctx.beginPath();
                  ctx.moveTo(x, y0);
                  ctx.lineTo(x - tw * (1 - k * 0.22), y1);
                  ctx.lineTo(x + tw * (1 - k * 0.22), y1);
                  ctx.closePath();
                  ctx.fill();
                }
                ctx.fillStyle = "rgba(226, 238, 255, 0.55)";
                ctx.beginPath();
                ctx.moveTo(x, base - th);
                ctx.lineTo(x - tw * 0.32, base - th * 0.78);
                ctx.lineTo(x + tw * 0.32, base - th * 0.78);
                ctx.closePath();
                ctx.fill();
              }
            }
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, top);
            g.addColorStop(1, bottom);
            trace();
            ctx.fillStyle = g;
            ctx.fill();
            ctx.beginPath();
            for (let x = 0; x <= w; x += 8) {
              const y = ridge(x / w) * h;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
            ctx.lineWidth = 3;
            ctx.stroke();
          },
          512,
        );
      const farHill = hillTex(ridgeFar, "rgba(176, 200, 240, 0.78)", "rgba(88, 118, 180, 0.92)", true);
      const nearHill = hillTex(ridgeNear, "rgba(236, 245, 255, 0.96)", "rgba(168, 194, 236, 1)", false);

      const treeTiers: [number, number, number][] = [
        [70, 260, 105],
        [170, 400, 140],
        [290, 540, 175],
        [410, 690, 215],
      ];
      const treeTex = makeTex(
        512,
        (ctx, w) => {
          const cx = w / 2;
          ctx.fillStyle = "#4a2a14";
          ctx.fillRect(cx - 22, 690, 44, 46);
          for (const [top, bot, W] of treeTiers.slice().reverse()) {
            const g = ctx.createLinearGradient(cx - W, 0, cx + W, 0);
            g.addColorStop(0, "#26905a");
            g.addColorStop(0.5, "#0f5a38");
            g.addColorStop(1, "#083a26");
            const n = 6;
            ctx.beginPath();
            ctx.moveTo(cx, top);
            ctx.quadraticCurveTo(cx + W * 0.55, (top + bot) / 2 - 10, cx + W, bot);
            for (let i = 0; i < n; i++) {
              const x0 = cx + W - (i * 2 * W) / n;
              const x1 = cx + W - ((i + 1) * 2 * W) / n;
              ctx.quadraticCurveTo((x0 + x1) / 2, bot + 24, x1, bot);
            }
            ctx.quadraticCurveTo(cx - W * 0.55, (top + bot) / 2 - 10, cx, top);
            ctx.closePath();
            ctx.fillStyle = g;
            ctx.fill();
            // Snow resting on the boughs
            ctx.fillStyle = "rgba(240, 248, 255, 0.9)";
            for (let i = 0; i < n; i++) {
              const x = cx + W - ((i + 0.5) * 2 * W) / n;
              ctx.beginPath();
              ctx.ellipse(x, bot + 9, (W / n) * 0.7, 7, 0, 0, TAU);
              ctx.fill();
            }
            for (const side of [-1, 1]) {
              for (let k = 0; k < 3; k++) {
                const tt = 0.3 + k * 0.25 + rnd() * 0.05;
                ctx.beginPath();
                ctx.ellipse(cx + side * W * tt * 0.78, top + (bot - top) * tt, 14, 5, side * 0.5, 0, TAU);
                ctx.fill();
              }
            }
            // Gold bead garland
            const y0 = top + (bot - top) * 0.58;
            ctx.save();
            ctx.setLineDash([1, 9]);
            ctx.lineCap = "round";
            ctx.lineWidth = 6;
            ctx.strokeStyle = "#ffd75e";
            ctx.beginPath();
            ctx.moveTo(cx - W * 0.5, y0 - 12);
            ctx.quadraticCurveTo(cx, y0 + 46, cx + W * 0.5, y0 - 12);
            ctx.stroke();
            ctx.restore();
          }
          // Baubles
          const colors: [string, string, string][] = [
            ["#ff8a80", "#e53935", "#8e1010"],
            ["#fff3b0", "#ffc83d", "#a87400"],
            ["#9fd8ff", "#3d8bff", "#173f9c"],
            ["#ffffff", "#c8d2de", "#7a8794"],
          ];
          for (const [top, bot, W] of treeTiers.slice(1)) {
            for (let i = 0; i < 6; i++) {
              const y = top + (bot - top) * (0.35 + rnd() * 0.55);
              const half = W * ((y - top) / (bot - top)) * 0.8;
              const x = cx + (rnd() * 2 - 1) * half;
              const r = 7 + rnd() * 4;
              const [l, m, d] = colors[Math.floor(rnd() * colors.length)];
              const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
              g.addColorStop(0, l);
              g.addColorStop(0.5, m);
              g.addColorStop(1, d);
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(x, y, r, 0, TAU);
              ctx.fill();
            }
          }
          // Gifts
          const gift = (x: number, y: number, bw: number, bh: number, box: string, ribbon: string) => {
            ctx.fillStyle = box;
            ctx.fillRect(x, y, bw, bh);
            ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
            ctx.fillRect(x + bw * 0.62, y, bw * 0.38, bh);
            ctx.fillStyle = ribbon;
            ctx.fillRect(x + bw / 2 - 4, y, 8, bh);
            ctx.fillRect(x, y + bh / 2 - 4, bw, 8);
            ctx.beginPath();
            ctx.ellipse(x + bw / 2 - 9, y - 4, 10, 6, -0.5, 0, TAU);
            ctx.ellipse(x + bw / 2 + 9, y - 4, 10, 6, 0.5, 0, TAU);
            ctx.fill();
          };
          gift(cx - 196, 712, 54, 54, "#d32f2f", "#ffd75e");
          gift(cx + 138, 722, 62, 44, "#2b6fd6", "#e6edf7");
          gift(cx - 128, 736, 44, 32, "#2e9d5b", "#ffd75e");
          // Topper star
          starPath(ctx, cx, 62, 34, 15);
          const sg = ctx.createRadialGradient(cx, 62, 2, cx, 62, 34);
          sg.addColorStop(0, "#fffbe0");
          sg.addColorStop(1, "#ffc83d");
          ctx.fillStyle = sg;
          ctx.fill();
        },
        768,
      );

      const baubleTex = (glow: string, light: string, mid: string, dark: string) =>
        makeTex(
          128,
          (ctx) => {
            const cx = 64;
            const cy = 100;
            blob(ctx, cx, cy, 62, glow, "rgba(255, 255, 255, 0)");
            ctx.strokeStyle = "rgba(255, 224, 150, 0.7)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, 34);
            ctx.stroke();
            ctx.fillStyle = "#f0c14b";
            ctx.fillRect(cx - 9, 34, 18, 12);
            const g = ctx.createRadialGradient(cx - 16, cy - 22, 4, cx, cy, 46);
            g.addColorStop(0, light);
            g.addColorStop(0.5, mid);
            g.addColorStop(1, dark);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, 42, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 42, 12, 0, 0, TAU);
            ctx.stroke();
            ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
            ctx.beginPath();
            ctx.ellipse(cx - 15, cy - 20, 9, 5, -0.6, 0, TAU);
            ctx.fill();
          },
          160,
        );
      const baubleSets = [
        baubleTex("rgba(255, 80, 70, 0.4)", "#ff9a90", "#e53935", "#7d0e0e"),
        baubleTex("rgba(255, 210, 90, 0.4)", "#fff3b0", "#ffc83d", "#a87400"),
        baubleTex("rgba(90, 160, 255, 0.4)", "#a8d6ff", "#3d8bff", "#173f9c"),
        baubleTex("rgba(210, 225, 240, 0.4)", "#ffffff", "#c8d2de", "#7a8794"),
        baubleTex("rgba(90, 200, 130, 0.4)", "#a8f0c4", "#2e9d5b", "#0f5a38"),
      ];

      // Sky
      const skyStars = [
        { n: 90, size: 0.3, f: 1.2 },
        { n: 46, size: 0.5, f: 0.8 },
      ].map((cfg) => {
        const p = makePoints(cfg.n, cfg.size, 0xffffff, -16, dot, 0.8);
        const uv = new Float32Array(cfg.n * 2);
        for (let i = 0; i < cfg.n; i++) {
          uv[i * 2] = rnd() * 2 - 1;
          uv[i * 2 + 1] = rnd() * 1.2 - 0.2;
        }
        return { ...cfg, ...p, uv, ph: rnd() * TAU };
      });
      const beth = sprite(rayStarTex, 0.95);
      let bethS = 6;

      const farH = sprite(farHill, 0.95);
      const nearH = sprite(nearHill);
      const glow = sprite(dot, 0.16);
      glow.material.color.setHex(0xffd27a);
      const tree = sprite(treeTex);
      const topper = sprite(rayStarTex);
      const strip = sprite(nearHill);
      let treeX = 0;
      let treeY = 0;
      let treeK = 0.01;

      const treeBulbs = Array.from({ length: 34 }, (_, i) => {
        const [top, bot, W] = treeTiers[Math.floor(rnd() * treeTiers.length)];
        const y = top + (bot - top) * (0.25 + rnd() * 0.65);
        const half = W * ((y - top) / (bot - top)) * 0.78;
        const x = 256 + (rnd() * 2 - 1) * half;
        const spr = sprite(dot, 0.8);
        spr.material.color.setHex([0xff5a5a, 0xffd54f, 0x66c8ff, 0x7dff9c, 0xff8ad8][i % 5]);
        return { spr, cx: x, cy: y, ph: i * 0.9 };
      });

      // Top string lights + hanging baubles
      const WN = 40;
      const wireGeo = new THREE.BufferGeometry();
      wireGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(WN * 3), 3));
      const wireMat = new THREE.LineBasicMaterial({ color: 0x9fb8a8, transparent: true, opacity: 0.5 });
      const wire = new THREE.Line(wireGeo, wireMat);
      wire.frustumCulled = false;
      scene.add(wire);
      disposables.push(wireGeo, wireMat);
      const bulbColors = [0xff5252, 0xffd54f, 0x4fc3f7, 0x69f0ae];
      const stringBulbs = bulbColors.map((c) => makePoints(8, 0.55, c, -3, dot, 0.9));
      const hangSpecs = [
        { u: 0.12, len: 1.4, size: 1.5, tex: 0 },
        { u: 0.3, len: 2.4, size: 1.7, tex: 1 },
        { u: 0.46, len: 1.3, size: 1.4, tex: 2 },
        { u: 0.64, len: 2.2, size: 1.6, tex: 3 },
        { u: 0.8, len: 1.5, size: 1.5, tex: 4 },
        { u: 0.93, len: 2.5, size: 1.7, tex: 0 },
      ];
      const hangs = hangSpecs.map((h) => ({ ...h, spr: sprite(baubleSets[h.tex]), ph: rnd() * TAU, ax: 0, ay: 0, sc: 1 }));
      const hangGeo = new THREE.BufferGeometry();
      hangGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(hangs.length * 6), 3));
      const hangMat = new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.55 });
      const hangLines = new THREE.LineSegments(hangGeo, hangMat);
      hangLines.frustumCulled = false;
      scene.add(hangLines);
      disposables.push(hangGeo, hangMat);

      // Snowfall in three depth bands
      const snow = [
        { n: 240, size: 0.18, speed: 0.5, z: -12, amp: 0.4, op: 0.6 },
        { n: 140, size: 0.3, speed: 1.0, z: -6, amp: 0.7, op: 0.8 },
        { n: 50, size: 0.62, speed: 1.9, z: 2, amp: 1.2, op: 0.6 },
      ].map((cfg) => {
        const p = makePoints(cfg.n, cfg.size, 0xffffff, cfg.z, dot, cfg.op);
        const base = new Float32Array(cfg.n * 3);
        for (let i = 0; i < cfg.n; i++) {
          base[i * 3] = rnd() * 2 - 1;
          base[i * 3 + 1] = rnd();
          base[i * 3 + 2] = rnd() * TAU;
        }
        return { ...cfg, ...p, base };
      });

      let lastT = 0;
      const layout = () => {
        const sky = half(-16);
        for (const g of skyStars) {
          for (let i = 0; i < g.n; i++) {
            g.arr[i * 3] = g.uv[i * 2] * sky.w * 1.08;
            g.arr[i * 3 + 1] = g.uv[i * 2 + 1] * sky.h;
            g.arr[i * 3 + 2] = 0;
          }
          g.geo.attributes.position.needsUpdate = true;
        }
        const b = half(-15);
        bethS = clamp(Math.min(b.w, b.h) * 0.5, 3, 9);
        beth.position.set(-b.w * 0.6, b.h * 0.6, -15);

        const far = half(-11);
        const farHt = far.h * 2 * 0.3;
        farH.scale.set(far.w * 2 * 1.12, farHt, 1);
        farH.position.set(0, -far.h + farHt / 2, -11);
        const near = half(-9.5);
        const nearHt = near.h * 2 * 0.2;
        nearH.scale.set(near.w * 2 * 1.12, nearHt, 1);
        nearH.position.set(0, -near.h + nearHt / 2, -9.5);

        const tr = half(-8);
        const treeH = Math.min(tr.h * 2 * 0.66, tr.w * 2 * 1.4);
        const treeW = (treeH * 512) / 768;
        treeK = treeH / 768;
        treeX = Math.min(tr.w * 0.62, tr.w - treeW * 0.5);
        treeY = -tr.h + tr.h * 2 * 0.06 + treeH / 2;
        tree.scale.set(treeW, treeH, 1);
        tree.position.set(treeX, treeY, -8);
        glow.scale.setScalar(treeH * 1.15);
        glow.position.set(treeX, treeY, -8.2);
        const worldOf = (cx: number, cy: number) => [treeX + (cx - 256) * treeK, treeY + (384 - cy) * treeK] as const;
        const [tx, ty] = worldOf(256, 62);
        topper.position.set(tx, ty, -7.9);
        for (const bl of treeBulbs) {
          const [x, y] = worldOf(bl.cx, bl.cy);
          bl.spr.position.set(x, y, -7.9);
        }

        const st = half(-5);
        strip.scale.set(st.w * 2 * 1.12, st.h * 2 * 0.16, 1);
        strip.position.set(0, -st.h + st.h * 2 * 0.08, -5);

        const g = half(-3);
        const sc = clamp(g.w / 12, 0.6, 1);
        const x0 = -g.w * 1.05;
        const x1 = g.w * 1.05;
        const sag = g.h * 0.08;
        const at = (u: number) => [x0 + (x1 - x0) * u, g.h - sag * 4 * u * (1 - u)] as const;
        const wp = wireGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < WN; i++) {
          const [x, y] = at(i / (WN - 1));
          wp.set([x, y, -3], i * 3);
        }
        wireGeo.attributes.position.needsUpdate = true;
        for (let i = 0; i < 32; i++) {
          const [x, y] = at((i + 0.5) / 32);
          const grp = stringBulbs[i % 4];
          const j = Math.floor(i / 4);
          grp.arr.set([x, y - 0.3, 0], j * 3);
          grp.geo.attributes.position.needsUpdate = true;
        }
        for (const h of hangs) {
          const [x, y] = at(h.u);
          h.ax = x;
          h.ay = y;
          h.sc = sc;
          h.spr.scale.set(h.size * sc, h.size * sc * 1.25, 1);
        }
      };

      const frame = (t: number) => {
        lastT = t;
        for (const g of skyStars) g.mat.opacity = 0.5 + 0.4 * Math.sin(t * g.f + g.ph);
        const pulse = 1 + Math.sin(t * 1.3) * 0.06;
        beth.scale.setScalar(bethS * pulse);
        beth.material.rotation = t * 0.04;
        beth.material.opacity = 0.85 + Math.sin(t * 1.3) * 0.1;
        topper.scale.setScalar(treeK * 190 * pulse);
        topper.material.rotation = -t * 0.06;
        for (const bl of treeBulbs) {
          const k = 0.5 + 0.5 * Math.sin(t * 2.2 + bl.ph);
          bl.spr.material.opacity = 0.2 + 0.8 * k * k;
          bl.spr.scale.setScalar(treeK * 40 * (0.8 + 0.5 * k));
        }
        stringBulbs.forEach((g, gi) => {
          const k = 0.5 + 0.5 * Math.sin(t * 2.4 + gi * 1.6);
          g.mat.opacity = 0.3 + 0.7 * k * k;
        });
        const hp = hangGeo.attributes.position.array as Float32Array;
        hangs.forEach((h, i) => {
          const a = Math.sin(t * 0.9 + h.ph) * 0.1 + Math.sin(t * 0.4 + h.ph * 2) * 0.04;
          const len = h.len * h.sc;
          const sh = h.size * h.sc * 1.25;
          const dx = Math.sin(a);
          const dy = -Math.cos(a);
          h.spr.position.set(h.ax + dx * (len + sh / 2), h.ay + dy * (len + sh / 2), -3);
          h.spr.material.rotation = a;
          hp.set([h.ax, h.ay, -3, h.ax + dx * len, h.ay + dy * len, -3], i * 6);
        });
        hangGeo.attributes.position.needsUpdate = true;

        for (const s of snow) {
          const h = half(s.z);
          const range = h.h * 2 + 2;
          for (let i = 0; i < s.n; i++) {
            const u = s.base[i * 3];
            const v = s.base[i * 3 + 1];
            const ph = s.base[i * 3 + 2];
            s.arr[i * 3] = u * h.w * 1.05 + Math.sin(t * 0.6 + ph) * s.amp;
            s.arr[i * 3 + 1] = h.h + 1 - ((v * range + t * s.speed) % range);
            s.arr[i * 3 + 2] = 0;
          }
          s.geo.attributes.position.needsUpdate = true;
        }
      };

      onResize = () => {
        layout();
        frame(lastT);
      };
      tick = (t) => {
        frame(t);
        parallax();
      };
    } else if (effectiveSkin === "lunar-new-year") {
      const dot = softDot();

      const petalTex = makeTex(32, (ctx, s) => {
        const c = s / 2;
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(-0.6);
        ctx.scale(1, 0.62);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c - 2);
        g.addColorStop(0, "rgba(255, 255, 255, 1)");
        g.addColorStop(1, "rgba(255, 255, 255, 0.55)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, c - 2, 0, TAU);
        ctx.fill();
        ctx.restore();
      });

      // Blossom branch that grows out of the top-left corner of its canvas
      const branchTex = (petal: [string, string], centre: string, gold: string) =>
        makeTex(768, (ctx) => {
          const flowers: { x: number; y: number; r: number }[] = [];
          const grow = (x: number, y: number, a: number, len: number, wd: number, d: number) => {
            const bend = (rnd() - 0.5) * 0.7;
            const x2 = x + Math.cos(a + bend * 0.5) * len;
            const y2 = y + Math.sin(a + bend * 0.5) * len;
            const mx = x + Math.cos(a) * len * 0.5 + Math.cos(a + Math.PI / 2) * bend * len * 0.25;
            const my = y + Math.sin(a) * len * 0.5 + Math.sin(a + Math.PI / 2) * bend * len * 0.25;
            ctx.lineCap = "round";
            ctx.strokeStyle = "#3b1f14";
            ctx.lineWidth = wd;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(mx, my, x2, y2);
            ctx.stroke();
            if (d === 0) {
              flowers.push({ x: x2, y: y2, r: 13 + rnd() * 8 });
              return;
            }
            if (d <= 2) for (const k of [0.5, 0.8]) if (rnd() < 0.6) flowers.push({ x: x + (x2 - x) * k, y: y + (y2 - y) * k, r: 11 + rnd() * 7 });
            const kids = d >= 3 ? 2 : rnd() < 0.4 ? 3 : 2;
            for (let i = 0; i < kids; i++) grow(x2, y2, a + (rnd() - 0.5) * 1.3 + (i - 0.5) * 0.5, len * (0.62 + rnd() * 0.15), wd * 0.62, d - 1);
            if (d >= 3) grow(mx, my, a + (rnd() < 0.5 ? -1 : 1) * 0.8, len * 0.5, wd * 0.55, d - 2);
          };
          grow(-10, -10, 0.78, 250, 15, 4);
          for (const f of flowers) {
            for (let k = 0; k < 5; k++) {
              const a = (k * TAU) / 5 + f.x * 0.01;
              const px = f.x + Math.cos(a) * f.r * 0.55;
              const py = f.y + Math.sin(a) * f.r * 0.55;
              const g = ctx.createRadialGradient(px, py, 0, px, py, f.r * 0.62);
              g.addColorStop(0, petal[0]);
              g.addColorStop(1, petal[1]);
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(px, py, f.r * 0.55, 0, TAU);
              ctx.fill();
            }
            ctx.fillStyle = centre;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r * 0.22, 0, TAU);
            ctx.fill();
            ctx.fillStyle = gold;
            for (let k = 0; k < 6; k++) {
              const a = (k * TAU) / 6;
              ctx.beginPath();
              ctx.arc(f.x + Math.cos(a) * f.r * 0.36, f.y + Math.sin(a) * f.r * 0.36, 1.6, 0, TAU);
              ctx.fill();
            }
          }
          // Buds
          for (let i = 0; i < 18; i++) {
            const f = flowers[Math.floor(rnd() * flowers.length)];
            if (!f) break;
            ctx.fillStyle = petal[1];
            ctx.beginPath();
            ctx.arc(f.x + (rnd() - 0.5) * 60, f.y + (rnd() - 0.5) * 60, 4 + rnd() * 3, 0, TAU);
            ctx.fill();
          }
        });
      const daoTex = branchTex(["#ffd3e0", "#f06292"], "#ffe27a", "#ffd54f");
      const maiTex = branchTex(["#fff2a0", "#f5b921"], "#b45f06", "#8d4a00");

      const redLanternTex = makeTex(
        256,
        (ctx, w) => {
          const cx = w / 2;
          const cy = 150;
          blob(ctx, cx, cy, 124, "rgba(255, 70, 50, 0.5)", "rgba(255, 50, 40, 0)");
          ctx.strokeStyle = "rgba(255, 214, 120, 0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, cy - 100);
          ctx.stroke();
          const gold = ctx.createLinearGradient(0, 0, 0, 14);
          gold.addColorStop(0, "#ffe08a");
          gold.addColorStop(1, "#c98a1b");
          ctx.fillStyle = gold;
          ctx.fillRect(cx - 38, cy - 100, 76, 14);
          ctx.fillRect(cx - 38, cy + 86, 76, 14);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(0.95, 1);
          const body = ctx.createRadialGradient(-30, -40, 10, 0, 0, 100);
          body.addColorStop(0, "#ff6b57");
          body.addColorStop(0.55, "#e0261f");
          body.addColorStop(1, "#8f0d0d");
          ctx.fillStyle = body;
          ctx.beginPath();
          ctx.ellipse(0, 0, 92, 88, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 210, 120, 0.5)";
          ctx.lineWidth = 2;
          for (let i = -3; i <= 3; i++) {
            const off = i * 24;
            ctx.beginPath();
            ctx.moveTo(off * 0.3, -86);
            ctx.bezierCurveTo(off * 1.1, -30, off * 1.1, 30, off * 0.3, 86);
            ctx.stroke();
          }
          ctx.restore();
          // Coin emblem
          ctx.strokeStyle = "#ffd76a";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(cx, cy, 30, 0, TAU);
          ctx.stroke();
          ctx.lineWidth = 4;
          ctx.strokeRect(cx - 10, cy - 10, 20, 20);
          // Tassel
          ctx.strokeStyle = "#f4c94a";
          ctx.lineWidth = 3;
          for (let k = -3; k <= 3; k++) {
            ctx.beginPath();
            ctx.moveTo(cx + k * 4, cy + 108);
            ctx.lineTo(cx + k * 6, cy + 108 + 62 - Math.abs(k) * 4);
            ctx.stroke();
          }
          ctx.fillStyle = "#e0261f";
          ctx.strokeStyle = "#ffd76a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy + 106, 9, 0, TAU);
          ctx.fill();
          ctx.stroke();
        },
        340,
      );

      const envelopeTex = makeTex(
        128,
        (ctx) => {
          const g = ctx.createLinearGradient(0, 0, 0, 200);
          g.addColorStop(0, "#f0443a");
          g.addColorStop(1, "#b3161a");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.roundRect(6, 6, 116, 188, 12);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 214, 110, 0.85)";
          ctx.lineWidth = 2;
          ctx.strokeRect(15, 15, 98, 170);
          ctx.beginPath();
          ctx.moveTo(15, 15);
          ctx.lineTo(64, 78);
          ctx.lineTo(113, 15);
          ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
          ctx.fill();
          ctx.stroke();
          const cg = ctx.createRadialGradient(58, 114, 2, 64, 120, 26);
          cg.addColorStop(0, "#fff2a8");
          cg.addColorStop(1, "#d99a1c");
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(64, 120, 24, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "#b3161a";
          ctx.fillRect(56, 112, 16, 16);
        },
        200,
      );

      const coinTex = makeTex(64, (ctx, s) => {
        const c = s / 2;
        const g = ctx.createRadialGradient(c - 8, c - 8, 2, c, c, 28);
        g.addColorStop(0, "#fff2a8");
        g.addColorStop(0.6, "#f4c430");
        g.addColorStop(1, "#b8860b");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c, c, 28, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(120, 80, 0, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c, c, 23, 0, TAU);
        ctx.stroke();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillRect(c - 6, c - 6, 12, 12);
      });

      // Warm haze behind the fireworks
      const haze = sprite(dot, 0.22);
      haze.material.color.setHex(0xffb347);
      const dao = sprite(daoTex);
      const mai = sprite(maiTex);

      // Fireworks: three staggered launchers, each a rocket + a radial burst
      const FW = 72;
      const FW_COLORS = [0xffd54f, 0xff5a4d, 0xff8ab5, 0xffb74d, 0xfff3c4];
      const fireworks = [1.7, 3.2, 0.5].map((off) => {
        const p = makePoints(FW, 0.46, 0xffd54f, -13, dot, 0);
        const dirs = new Float32Array(FW * 2);
        const speeds = new Float32Array(FW);
        for (let i = 0; i < FW; i++) {
          const a = (i / FW) * TAU + (rnd() - 0.5) * 0.08;
          dirs[i * 2] = Math.cos(a);
          dirs[i * 2 + 1] = Math.sin(a);
          speeds[i] = i % 3 === 0 ? 6 + rnd() * 3 : 11 + rnd() * 2.5;
        }
        const rocket = sprite(dot, 0);
        rocket.material.color.setHex(0xffe9a8);
        const flash = sprite(dot, 0);
        flash.material.color.setHex(0xffd27a);
        return { ...p, off, dirs, speeds, rocket, flash };
      });

      // Hanging red lanterns
      const lanternSpecs = [
        { u: 0.1, len: 3.4, size: 3.0 },
        { u: 0.3, len: 6.2, size: 3.4 },
        { u: 0.5, len: 3.0, size: 2.9 },
        { u: 0.7, len: 5.4, size: 3.3 },
        { u: 0.88, len: 3.6, size: 3.0 },
      ];
      const lanterns = lanternSpecs.map((l) => ({ ...l, spr: sprite(redLanternTex), ph: rnd() * TAU, ax: 0, ay: 0, sc: 1 }));
      const lanternGeo = new THREE.BufferGeometry();
      lanternGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lanterns.length * 6), 3));
      const lanternMat = new THREE.LineBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.6 });
      const lanternLines = new THREE.LineSegments(lanternGeo, lanternMat);
      lanternLines.frustumCulled = false;
      scene.add(lanternLines);
      disposables.push(lanternGeo, lanternMat);

      // Falling lì xì, coins and petals
      const envelopes = Array.from({ length: 12 }, () => ({
        spr: sprite(envelopeTex),
        u: rnd() * 2 - 1,
        z: -6 + rnd() * 5,
        w: 0.9 + rnd() * 0.5,
        speed: 0.5 + rnd() * 0.6,
        off: rnd(),
        ph: rnd() * TAU,
      }));
      const coins = Array.from({ length: 18 }, () => ({
        spr: sprite(coinTex),
        u: rnd() * 2 - 1,
        z: -7 + rnd() * 6,
        size: 0.5 + rnd() * 0.3,
        speed: 0.8 + rnd() * 0.8,
        off: rnd(),
        ph: rnd() * TAU,
      }));
      const petals = [
        { n: 70, color: 0xffb3c8 },
        { n: 40, color: 0xffd75a },
      ].map((cfg) => {
        const p = makePoints(cfg.n, 0.42, cfg.color, -5, petalTex, 0.9);
        const base = new Float32Array(cfg.n * 3);
        for (let i = 0; i < cfg.n; i++) {
          base[i * 3] = rnd() * 2 - 1;
          base[i * 3 + 1] = rnd();
          base[i * 3 + 2] = rnd() * TAU;
        }
        return { ...cfg, ...p, base };
      });
      const dust = makePoints(120, 0.16, 0xffd76a, -8, dot, 0.8);
      const dustBase = new Float32Array(120 * 3);
      for (let i = 0; i < 120; i++) {
        dustBase[i * 3] = rnd() * 2 - 1;
        dustBase[i * 3 + 1] = rnd();
        dustBase[i * 3 + 2] = rnd() * TAU;
      }

      let lastT = 0;
      const layout = () => {
        const hz = half(-16);
        haze.position.set(0, hz.h * 0.35, -16);
        haze.scale.set(hz.w * 2.2, hz.h * 1.6, 1);
        const b = half(-3.5);
        const side = Math.min(b.h * 2 * 0.56, b.w * 2 * 0.95);
        dao.scale.set(side, side, 1);
        dao.position.set(-b.w + side / 2, b.h - side / 2, -3.5);
        mai.scale.set(side, side, 1);
        mai.position.set(b.w - side / 2, -b.h + side / 2, -3.5);
        const g = half(-2);
        const sc = clamp(g.w / 12, 0.6, 1);
        for (const l of lanterns) {
          l.ax = l.u * g.w;
          l.ay = g.h + 1;
          l.sc = sc;
          l.spr.scale.set(l.size * sc, l.size * sc * (340 / 256), 1);
        }
      };

      const frame = (t: number) => {
        lastT = t;
        const f = half(-13);
        fireworks.forEach((ch, ci) => {
          const tt = t + ch.off;
          const slot = Math.floor(tt / 4.2);
          const local = tt - slot * 4.2;
          const sd = slot * 3 + ci;
          const ox = (hash(sd) * 1.5 - 0.75) * f.w;
          const oy = (0.1 + hash(sd + 9.1) * 0.55) * f.h;
          ch.mat.color.setHex(FW_COLORS[Math.floor(hash(sd + 3.3) * FW_COLORS.length)]);
          if (local < 0.9) {
            const p = local / 0.9;
            ch.rocket.position.set(ox, -f.h + (oy + f.h) * p * (2 - p), -13);
            ch.rocket.scale.setScalar(0.6);
            ch.rocket.material.opacity = 0.9;
            ch.mat.opacity = 0;
            ch.flash.material.opacity = 0;
          } else if (local < 3.3) {
            const tau = local - 0.9;
            const d = (1 - Math.exp(-2.6 * tau)) / 2.6;
            for (let i = 0; i < FW; i++) {
              ch.arr[i * 3] = ox + ch.dirs[i * 2] * ch.speeds[i] * d;
              ch.arr[i * 3 + 1] = oy + ch.dirs[i * 2 + 1] * ch.speeds[i] * d - 0.8 * tau * tau;
              ch.arr[i * 3 + 2] = 0;
            }
            ch.geo.attributes.position.needsUpdate = true;
            ch.rocket.material.opacity = 0;
            ch.mat.opacity = Math.pow(clamp(1 - tau / 2.4, 0, 1), 1.2) * (0.8 + 0.2 * Math.sin(tau * 30));
            ch.flash.position.set(ox, oy, -13.1);
            ch.flash.scale.setScalar(7 * (1 + tau));
            ch.flash.material.opacity = 0.7 * Math.exp(-5 * tau);
          } else {
            ch.rocket.material.opacity = 0;
            ch.mat.opacity = 0;
            ch.flash.material.opacity = 0;
          }
        });

        const sway = Math.sin(t * 0.5) * 0.012;
        dao.material.rotation = sway;
        mai.material.rotation = Math.PI - sway;

        const lp = lanternGeo.attributes.position.array as Float32Array;
        lanterns.forEach((l, i) => {
          const a = Math.sin(t * 0.7 + l.ph) * 0.07 + Math.sin(t * 0.33 + l.ph * 2) * 0.03;
          const len = l.len * l.sc;
          const sh = l.size * l.sc * (340 / 256);
          const dx = Math.sin(a);
          const dy = -Math.cos(a);
          l.spr.position.set(l.ax + dx * (len + sh / 2), l.ay + dy * (len + sh / 2), -2);
          l.spr.material.rotation = a;
          l.spr.material.opacity = 0.94 + Math.sin(t * 2 + l.ph) * 0.06;
          lp.set([l.ax, l.ay, -2, l.ax + dx * len, l.ay + dy * len, -2], i * 6);
        });
        lanternGeo.attributes.position.needsUpdate = true;

        for (const e of envelopes) {
          const h = half(e.z);
          const range = h.h * 2 + 3;
          const y = h.h + 1.5 - ((e.off * range + t * e.speed) % range);
          e.spr.position.set(e.u * h.w + Math.sin(t * 0.5 + e.ph) * 0.8, y, e.z);
          e.spr.scale.set(e.w, e.w * 1.55, 1);
          e.spr.material.rotation = Math.sin(t * 0.7 + e.ph) * 0.5;
        }
        for (const c of coins) {
          const h = half(c.z);
          const range = h.h * 2 + 3;
          const y = h.h + 1.5 - ((c.off * range + t * c.speed) % range);
          c.spr.position.set(c.u * h.w + Math.sin(t * 0.6 + c.ph) * 0.6, y, c.z);
          c.spr.scale.set(c.size * Math.max(0.12, Math.abs(Math.cos(t * 2 + c.ph))), c.size, 1);
        }
        const ph = half(-5);
        const prange = ph.h * 2 + 2;
        for (const g of petals) {
          for (let i = 0; i < g.n; i++) {
            const u = g.base[i * 3];
            const v = g.base[i * 3 + 1];
            const p = g.base[i * 3 + 2];
            g.arr[i * 3] = u * ph.w * 1.05 + Math.sin(t * 0.8 + p) * 1.1;
            g.arr[i * 3 + 1] = ph.h + 1 - ((v * prange + t * (0.6 + (p % 1) * 0.5)) % prange);
            g.arr[i * 3 + 2] = 0;
          }
          g.geo.attributes.position.needsUpdate = true;
        }
        const dh = half(-8);
        const drange = dh.h * 2 + 2;
        for (let i = 0; i < 120; i++) {
          dust.arr[i * 3] = dustBase[i * 3] * dh.w * 1.05 + Math.sin(t * 0.4 + dustBase[i * 3 + 2]) * 0.5;
          dust.arr[i * 3 + 1] = -dh.h - 1 + ((dustBase[i * 3 + 1] * drange + t * 0.35) % drange);
          dust.arr[i * 3 + 2] = 0;
        }
        dust.geo.attributes.position.needsUpdate = true;
        dust.mat.opacity = 0.6 + Math.sin(t * 2) * 0.2;
      };

      onResize = () => {
        layout();
        frame(lastT);
      };
      tick = (t) => {
        frame(t);
        parallax();
      };
    } else if (effectiveSkin === "halloween") {
      const dot = softDot();
      const INK = "rgba(10, 5, 18, 0.97)";

      // ── Textures ─────────────────────────────────────────────────────────
      const auraTex = makeTex(512, (ctx, s) => {
        const c = s / 2;
        const g = ctx.createRadialGradient(c, c, s / 12, c, c, c);
        g.addColorStop(0, "rgba(255, 150, 50, 0.6)");
        g.addColorStop(0.35, "rgba(255, 110, 30, 0.22)");
        g.addColorStop(0.7, "rgba(200, 70, 30, 0.06)");
        g.addColorStop(1, "rgba(200, 70, 30, 0)");
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
        base.addColorStop(0, "#ffe9b0");
        base.addColorStop(0.5, "#ffb04a");
        base.addColorStop(1, "#e2701a");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, s, s);
        const maria = [
          [0.36, 0.34, 0.16],
          [0.58, 0.3, 0.1],
          [0.5, 0.56, 0.18],
          [0.72, 0.52, 0.09],
          [0.34, 0.64, 0.09],
          [0.62, 0.77, 0.11],
        ];
        for (const [u, v, r] of maria) blob(ctx, u * s, v * s, r * s, "rgba(150, 70, 20, 0.4)", "rgba(150, 70, 20, 0)");
        for (let i = 0; i < 40; i++) {
          const a = rnd() * TAU;
          const d = Math.sqrt(rnd()) * R * 0.9;
          const x = c + Math.cos(a) * d;
          const y = c + Math.sin(a) * d;
          const r = 3 + rnd() * 11;
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = "rgba(120, 50, 10, 0.22)";
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.stroke();
          ctx.strokeStyle = "rgba(255, 235, 190, 0.4)";
          ctx.beginPath();
          ctx.arc(x + 1, y + 1, r, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
        const limb = ctx.createRadialGradient(c, c, R * 0.6, c, c, R);
        limb.addColorStop(0, "rgba(180, 60, 10, 0)");
        limb.addColorStop(1, "rgba(180, 60, 10, 0.45)");
        ctx.fillStyle = limb;
        ctx.fillRect(0, 0, s, s);
        ctx.restore();
      });

      const ridgeFar = (u: number) => 0.46 + 0.09 * Math.sin(u * 6 + 2) + 0.05 * Math.sin(u * 15 + 1) + 0.025 * Math.sin(u * 33);
      const ridgeNear = (u: number) => 0.55 + 0.06 * Math.sin(u * 4 + 1) + 0.035 * Math.sin(u * 11 + 3) + 0.015 * Math.sin(u * 27);
      const hillTex = (ridge: (u: number) => number, top: string, bottom: string, rim: string, graves: boolean) =>
        makeTex(
          2048,
          (ctx, w, h) => {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, top);
            g.addColorStop(1, bottom);
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let x = 0; x <= w; x += 8) ctx.lineTo(x, ridge(x / w) * h);
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fillStyle = g;
            ctx.fill();
            ctx.beginPath();
            for (let x = 0; x <= w; x += 8) {
              const y = ridge(x / w) * h;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = rim;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            if (!graves) return;
            // Tombstones and crosses (drawn narrow: the sprite is stretched horizontally)
            ctx.fillStyle = INK;
            for (let x = 40; x < w; x += 46 + rnd() * 80) {
              const y = ridge(x / w) * h + 6;
              const kind = rnd();
              if (kind < 0.55) {
                const tw = 12 + rnd() * 8;
                const th = 26 + rnd() * 26;
                ctx.beginPath();
                ctx.moveTo(x - tw, y);
                ctx.lineTo(x - tw, y - th + tw);
                ctx.arc(x, y - th + tw, tw, Math.PI, 0);
                ctx.lineTo(x + tw, y);
                ctx.closePath();
                ctx.fill();
              } else if (kind < 0.85) {
                const th = 38 + rnd() * 28;
                ctx.fillRect(x - 3, y - th, 6, th);
                ctx.fillRect(x - 12, y - th * 0.72, 24, 6);
              } else {
                ctx.beginPath();
                ctx.moveTo(x - 9, y);
                ctx.lineTo(x - 9, y - 30);
                ctx.lineTo(x, y - 44);
                ctx.lineTo(x + 9, y - 30);
                ctx.lineTo(x + 9, y);
                ctx.closePath();
                ctx.fill();
              }
            }
            // Iron fence along the right half
            const fx0 = w * 0.55;
            const fx1 = w * 0.96;
            const base = (x: number) => ridge(x / w) * h + 26;
            for (let x = fx0; x < fx1; x += 14) {
              const y = base(x);
              ctx.fillRect(x - 1.5, y - 66, 3, 70);
              ctx.beginPath();
              ctx.moveTo(x - 5, y - 66);
              ctx.lineTo(x, y - 80);
              ctx.lineTo(x + 5, y - 66);
              ctx.closePath();
              ctx.fill();
            }
            ctx.strokeStyle = INK;
            ctx.lineWidth = 4;
            for (const dy of [-52, -22]) {
              ctx.beginPath();
              for (let x = fx0; x <= fx1; x += 14) {
                const y = base(x) + dy;
                if (x === fx0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            }
          },
          512,
        );
      const farTex = hillTex(ridgeFar, "rgba(74, 34, 92, 0.72)", "rgba(28, 12, 44, 0.92)", "rgba(255, 150, 70, 0.3)", false);
      const nearTex = hillTex(ridgeNear, "rgba(26, 12, 38, 0.95)", "rgba(10, 5, 18, 1)", "rgba(255, 130, 50, 0.22)", true);

      // Haunted mansion with glowing windows
      const houseTex = makeTex(512, (ctx) => {
        ctx.fillStyle = INK;
        ctx.fillRect(90, 260, 330, 212);
        const poly = (pts: number[][]) => {
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          ctx.fill();
        };
        poly([
          [70, 272],
          [256, 150],
          [440, 272],
        ]);
        ctx.fillRect(28, 200, 88, 272);
        poly([
          [16, 208],
          [72, 92],
          [128, 208],
        ]);
        ctx.fillRect(398, 232, 76, 240);
        poly([
          [388, 240],
          [436, 140],
          [484, 240],
        ]);
        ctx.fillRect(322, 168, 26, 84);
        ctx.fillRect(316, 162, 38, 10);
        ctx.fillRect(66, 60, 3, 40);
        poly([
          [69, 62],
          [96, 70],
          [69, 80],
        ]);
        ctx.save();
        ctx.shadowBlur = 16;
        const win = (x: number, y: number, w: number, h: number, color: string) => {
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x, y + h);
          ctx.lineTo(x, y + w / 2);
          ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
          ctx.lineTo(x + w, y + h);
          ctx.closePath();
          ctx.fill();
        };
        win(58, 250, 26, 44, "#ffb347");
        win(58, 340, 26, 44, "#ffd27a");
        win(150, 300, 30, 50, "#ffb347");
        win(240, 290, 34, 56, "#9cff6b");
        win(330, 300, 30, 50, "#ffb347");
        win(150, 390, 30, 50, "#ffd27a");
        win(420, 290, 26, 44, "#ffb347");
        win(420, 370, 26, 44, "#ff9a3c");
        win(236, 400, 40, 72, "#ff8a2a");
        ctx.restore();
        ctx.fillStyle = INK;
        ctx.fillRect(0, 468, 512, 44);
      });

      // Twisted dead tree, grown from the bottom-centre of its canvas
      const deadTreeTex = makeTex(
        512,
        (ctx, w, h) => {
          ctx.lineCap = "round";
          ctx.strokeStyle = INK;
          const grow = (x: number, y: number, a: number, len: number, wd: number, d: number) => {
            const bend = (rnd() - 0.5) * 0.9;
            const x2 = x + Math.cos(a + bend) * len;
            const y2 = y + Math.sin(a + bend) * len;
            const mx = x + Math.cos(a) * len * 0.5 + Math.cos(a + Math.PI / 2) * bend * len * 0.3;
            const my = y + Math.sin(a) * len * 0.5 + Math.sin(a + Math.PI / 2) * bend * len * 0.3;
            ctx.lineWidth = Math.max(1.5, wd);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(mx, my, x2, y2);
            ctx.stroke();
            if (d === 0) return;
            const kids = rnd() < 0.35 ? 3 : 2;
            for (let i = 0; i < kids; i++) grow(x2, y2, a + (rnd() - 0.5) * 1.1 + (i - (kids - 1) / 2) * 0.55, len * (0.7 + rnd() * 0.12), wd * 0.68, d - 1);
            if (d >= 2 && rnd() < 0.6) grow(mx, my, a + (rnd() < 0.5 ? -1 : 1) * (0.7 + rnd() * 0.4), len * 0.55, wd * 0.55, d - 2);
          };
          grow(w * 0.5, h + 10, -Math.PI / 2, 230, 34, 5);
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.ellipse(w * 0.5, h - 6, 56, 16, 0, 0, TAU);
          ctx.fill();
        },
        768,
      );

      const pumpkinTex = makeTex(256, (ctx, s) => {
        const cx = s / 2;
        const cy = 150;
        blob(ctx, cx, cy, 126, "rgba(255, 140, 30, 0.5)", "rgba(255, 120, 20, 0)");
        ctx.fillStyle = "#527a2c";
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy - 62);
        ctx.quadraticCurveTo(cx - 10, cy - 90, cx + 6, cy - 100);
        ctx.lineTo(cx + 14, cy - 92);
        ctx.quadraticCurveTo(cx + 6, cy - 84, cx + 10, cy - 62);
        ctx.closePath();
        ctx.fill();
        for (const [dx, rx, ry] of [
          [-74, 44, 66],
          [74, 44, 66],
          [-42, 60, 74],
          [42, 60, 74],
          [0, 58, 78],
        ]) {
          const g = ctx.createRadialGradient(cx + dx - 14, cy - 24, 6, cx + dx, cy, ry);
          g.addColorStop(0, "#ffb347");
          g.addColorStop(0.6, "#f0781a");
          g.addColorStop(1, "#a8430a");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(cx + dx, cy, rx, ry, 0, 0, TAU);
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(120, 50, 5, 0.35)";
        ctx.lineWidth = 3;
        for (const dx of [-58, -28, 28, 58]) {
          ctx.beginPath();
          ctx.ellipse(cx + dx, cy, 8, 68, 0, 0, TAU);
          ctx.stroke();
        }
        // Carved face with candle glow
        ctx.save();
        ctx.shadowColor = "#ffb020";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#fff3a8";
        const tri = (pts: number[][]) => {
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          ctx.fill();
        };
        tri([
          [cx - 56, cy - 14],
          [cx - 24, cy - 14],
          [cx - 40, cy - 42],
        ]);
        tri([
          [cx + 24, cy - 14],
          [cx + 56, cy - 14],
          [cx + 40, cy - 42],
        ]);
        tri([
          [cx, cy + 2],
          [cx - 10, cy + 20],
          [cx + 10, cy + 20],
        ]);
        ctx.beginPath();
        ctx.moveTo(cx - 60, cy + 32);
        for (const [x, y] of [
          [-40, 56],
          [-26, 42],
          [-10, 62],
          [8, 44],
          [24, 62],
          [40, 42],
          [60, 32],
        ])
          ctx.lineTo(cx + x, cy + y);
        ctx.quadraticCurveTo(cx, cy + 100, cx - 60, cy + 32);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      const ghostTex = makeTex(
        256,
        (ctx) => {
          blob(ctx, 128, 150, 130, "rgba(200, 190, 255, 0.45)", "rgba(200, 190, 255, 0)");
          const g = ctx.createLinearGradient(0, 60, 0, 290);
          g.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          g.addColorStop(1, "rgba(214, 204, 255, 0.5)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(56, 262);
          ctx.lineTo(56, 120);
          ctx.bezierCurveTo(56, 34, 200, 34, 200, 120);
          ctx.lineTo(200, 262);
          const n = 4;
          for (let i = 0; i < n; i++) {
            const x0 = 200 - (i * 144) / n;
            const x1 = 200 - ((i + 1) * 144) / n;
            ctx.quadraticCurveTo((x0 + x1) / 2, i % 2 === 0 ? 292 : 240, x1, 262);
          }
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255, 150, 180, 0.35)";
          ctx.beginPath();
          ctx.ellipse(86, 148, 12, 7, 0, 0, TAU);
          ctx.ellipse(170, 148, 12, 7, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "rgba(34, 22, 66, 0.92)";
          ctx.beginPath();
          ctx.ellipse(104, 118, 10, 16, 0, 0, TAU);
          ctx.ellipse(152, 118, 10, 16, 0, 0, TAU);
          ctx.ellipse(128, 160, 9, 14, 0, 0, TAU);
          ctx.fill();
        },
        320,
      );

      // Two wing positions; swapped every few frames for a flap
      const batTex = (up: boolean) =>
        makeTex(
          256,
          (ctx) => {
            ctx.fillStyle = INK;
            ctx.beginPath();
            ctx.ellipse(128, 70, 12, 22, 0, 0, TAU);
            ctx.arc(128, 46, 10, 0, TAU);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(120, 42);
            ctx.lineTo(122, 24);
            ctx.lineTo(128, 38);
            ctx.lineTo(134, 24);
            ctx.lineTo(136, 42);
            ctx.closePath();
            ctx.fill();
            for (const sign of [1, -1]) {
              ctx.save();
              ctx.translate(128, 0);
              ctx.scale(sign, 1);
              ctx.translate(-128, 0);
              const tip = [244, up ? 14 : 104];
              const end = [140, 90];
              ctx.beginPath();
              ctx.moveTo(136, 58);
              ctx.quadraticCurveTo(180, up ? 10 : 30, tip[0], tip[1]);
              let prev = tip;
              for (let i = 1; i <= 3; i++) {
                const t = i / 3;
                const cur = [tip[0] + (end[0] - tip[0]) * t, tip[1] + (end[1] - tip[1]) * t];
                const mid = [(prev[0] + cur[0]) / 2, (prev[1] + cur[1]) / 2];
                ctx.quadraticCurveTo(mid[0] + (128 - mid[0]) * 0.35, mid[1] + (70 - mid[1]) * 0.35, cur[0], cur[1]);
                prev = cur;
              }
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
          },
          128,
        );
      const batUp = batTex(true);
      const batDown = batTex(false);

      const spiderTex = makeTex(
        128,
        (ctx) => {
          ctx.strokeStyle = "rgba(230, 225, 255, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(64, 0);
          ctx.lineTo(64, 84);
          ctx.stroke();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          for (const sign of [-1, 1]) {
            for (let k = 0; k < 4; k++) {
              ctx.beginPath();
              ctx.moveTo(64 + sign * 10, 96 + k * 6);
              ctx.lineTo(64 + sign * (34 + k * 4), 66 + k * 22 - (k === 0 ? 12 : 0));
              ctx.lineTo(64 + sign * (52 + (k % 2) * 4), 100 + k * 22);
              ctx.stroke();
            }
          }
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.ellipse(64, 122, 26, 32, 0, 0, TAU);
          ctx.arc(64, 90, 15, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "rgba(255, 120, 30, 0.9)";
          ctx.beginPath();
          ctx.moveTo(56, 108);
          ctx.lineTo(72, 108);
          ctx.lineTo(64, 122);
          ctx.lineTo(72, 136);
          ctx.lineTo(56, 136);
          ctx.lineTo(64, 122);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#ff3b3b";
          ctx.beginPath();
          ctx.arc(58, 88, 2.4, 0, TAU);
          ctx.arc(70, 88, 2.4, 0, TAU);
          ctx.fill();
        },
        192,
      );

      // Corner cobweb anchored at the top-right of its canvas
      const webTex = makeTex(512, (ctx, s) => {
        ctx.strokeStyle = "rgba(232, 224, 255, 0.55)";
        ctx.lineWidth = 1.4;
        const rays = 7;
        const ang = (i: number) => Math.PI / 2 + (i * (Math.PI / 2)) / (rays - 1);
        for (let i = 0; i < rays; i++) {
          ctx.beginPath();
          ctx.moveTo(s, 0);
          ctx.lineTo(s + Math.cos(ang(i)) * s * 0.98, Math.sin(ang(i)) * s * 0.98);
          ctx.stroke();
        }
        for (const r of [70, 130, 190, 250, 320, 400]) {
          ctx.beginPath();
          for (let i = 0; i < rays; i++) {
            const x = s + Math.cos(ang(i)) * r;
            const y = Math.sin(ang(i)) * r;
            if (i === 0) {
              ctx.moveTo(x, y);
              continue;
            }
            const px = s + Math.cos(ang(i - 1)) * r;
            const py = Math.sin(ang(i - 1)) * r;
            ctx.quadraticCurveTo(s + ((px + x) / 2 - s) * 0.9, ((py + y) / 2) * 0.9, x, y);
          }
          ctx.stroke();
        }
      });

      const leafTex = makeTex(32, (ctx, s) => {
        const c = s / 2;
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(-0.7);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(-c + 2, 0);
        ctx.quadraticCurveTo(0, -c * 0.9, c - 2, 0);
        ctx.quadraticCurveTo(0, c * 0.9, -c + 2, 0);
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-c + 2, 0);
        ctx.lineTo(c - 2, 0);
        ctx.stroke();
        ctx.restore();
      });

      const mistTex = makeTex(
        512,
        (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          for (let i = 0; i <= 10; i++) blob(ctx, (i / 10) * w, h / 2 + (rnd() - 0.5) * 20, 50 + rnd() * 34, "rgba(255, 255, 255, 0.24)", "rgba(255, 255, 255, 0)", 0.5);
        },
        128,
      );

      // ── Sky ──────────────────────────────────────────────────────────────
      const flash = sprite(dot, 0);
      flash.material.color.setHex(0xcbb8ff);
      const skyStars = [
        { n: 80, size: 0.26, f: 1.1 },
        { n: 40, size: 0.42, f: 0.7 },
      ].map((cfg) => {
        const p = makePoints(cfg.n, cfg.size, 0xffe6c8, -16, dot, 0.7);
        const uv = new Float32Array(cfg.n * 2);
        for (let i = 0; i < cfg.n; i++) {
          uv[i * 2] = rnd() * 2 - 1;
          uv[i * 2 + 1] = rnd() * 1.3 - 0.3;
        }
        return { ...cfg, ...p, uv, ph: rnd() * TAU };
      });
      const aura = sprite(auraTex);
      const moon = sprite(moonTex);
      let moonS = 8;
      let moonX = 0;
      let moonY = 0;

      // ── Landscape ────────────────────────────────────────────────────────
      const farMt = sprite(farTex);
      const house = sprite(houseTex);
      const mistA = sprite(mistTex, 0.5);
      mistA.material.color.setHex(0xb9a4e6);
      const nearMt = sprite(nearTex);
      const mistB = sprite(mistTex, 0.4);
      mistB.material.color.setHex(0x9bd6a6);
      const deadTree = sprite(deadTreeTex);

      // Jack-o'-lanterns with a flickering candle
      const pumpkins = [
        { u: -0.84, size: 2.4 },
        { u: -0.62, size: 3.1 },
        { u: 0.36, size: 1.9 },
        { u: 0.62, size: 2.7 },
      ].map((p) => {
        const pool = sprite(dot, 0.4);
        pool.material.color.setHex(0xff8a2a);
        return { ...p, spr: sprite(pumpkinTex), pool, ph: rnd() * TAU };
      });

      // Bats
      const bats = Array.from({ length: 10 }, (_, i) => {
        const far = i < 6;
        return {
          spr: sprite(batUp),
          z: far ? -13 : -4,
          v: far ? 0.05 + rnd() * 0.6 : 0.3 + rnd() * 0.5,
          size: far ? 1.4 + rnd() * 0.9 : 2.5 + rnd() * 1,
          speed: (0.8 + rnd() * 0.8) * (i % 2 ? 1 : -1),
          off: rnd(),
          ph: rnd() * TAU,
        };
      });

      // Ghosts
      const ghosts = Array.from({ length: 4 }, () => ({
        spr: sprite(ghostTex, 0.7),
        z: -5 + rnd() * 2,
        v: -0.2 + rnd() * 0.8,
        size: 2.2 + rnd() * 1.4,
        speed: 0.12 + rnd() * 0.18,
        off: rnd(),
        ph: rnd() * TAU,
      }));

      // Wisps, spiders, web, falling leaves
      const wisps = Array.from({ length: 16 }, (_, i) => {
        const spr = sprite(dot, 0);
        spr.material.color.setHex(i % 2 ? 0x8dff6a : 0xb388ff);
        return { spr, u: rnd() * 2 - 1, v: -0.9 + rnd() * 1.2, z: -6 + rnd() * 4, size: 0.4 + rnd() * 0.5, ph: rnd() * TAU };
      });
      const web = sprite(webTex, 0.6);
      const spiders = [
        { u: 0.78, len: 4.5, size: 1.5 },
        { u: -0.2, len: 6.5, size: 1.2 },
      ].map((s) => ({ ...s, spr: sprite(spiderTex), ph: rnd() * TAU, ax: 0, ay: 0, sc: 1 }));
      const threadGeo = new THREE.BufferGeometry();
      threadGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(spiders.length * 6), 3));
      const threadMat = new THREE.LineBasicMaterial({ color: 0xe6e0ff, transparent: true, opacity: 0.55 });
      const threads = new THREE.LineSegments(threadGeo, threadMat);
      threads.frustumCulled = false;
      scene.add(threads);
      disposables.push(threadGeo, threadMat);
      const leaves = [0xf28c28, 0xb4531a, 0xe8b02a].map((color) => {
        const p = makePoints(30, 0.5, color, -3, leafTex, 0.9);
        const base = new Float32Array(30 * 3);
        for (let i = 0; i < 30; i++) {
          base[i * 3] = rnd() * 2 - 1;
          base[i * 3 + 1] = rnd();
          base[i * 3 + 2] = rnd() * TAU;
        }
        return { ...p, base };
      });

      // ── Layout and animation ─────────────────────────────────────────────
      let lastT = 0;
      const layout = () => {
        const sky = half(-16);
        for (const g of skyStars) {
          for (let i = 0; i < g.n; i++) {
            g.arr[i * 3] = g.uv[i * 2] * sky.w * 1.08;
            g.arr[i * 3 + 1] = g.uv[i * 2 + 1] * sky.h;
            g.arr[i * 3 + 2] = 0;
          }
          g.geo.attributes.position.needsUpdate = true;
        }
        flash.position.set(0, 0, -17);
        flash.scale.set(sky.w * 5, sky.h * 5, 1);

        const m = half(-14);
        moonS = clamp(Math.min(m.w, m.h) * 0.66, 4, 11.5);
        moonX = -Math.min(m.w * 0.5, m.w - moonS * 0.62);
        moonY = m.h * 0.4;
        moon.scale.setScalar(moonS);
        moon.position.set(moonX, moonY, -14);
        aura.scale.setScalar(moonS * 2.9);
        aura.position.set(moonX, moonY, -14.6);

        const far = half(-11);
        const farH = far.h * 2 * 0.34;
        const farW = far.w * 2 * 1.12;
        farMt.scale.set(farW, farH, 1);
        farMt.position.set(0, -far.h + farH / 2, -11);
        const hH = far.h * 2 * 0.27;
        const hx = -far.w * 0.5;
        const ridgeY = -far.h + farH - ridgeFar((hx + farW / 2) / farW) * farH;
        house.scale.set(hH, hH, 1);
        house.position.set(hx, ridgeY + hH * 0.46, -10.9);

        const mA = half(-10.4);
        mistA.scale.set(mA.w * 2 * 1.3, mA.h * 2 * 0.2, 1);
        mistA.position.set(0, -mA.h + mA.h * 2 * 0.2, -10.4);
        const near = half(-9);
        const nearH = near.h * 2 * 0.26;
        nearMt.scale.set(near.w * 2 * 1.12, nearH, 1);
        nearMt.position.set(0, -near.h + nearH / 2, -9);
        const mB = half(-8.6);
        mistB.scale.set(mB.w * 2 * 1.3, mB.h * 2 * 0.18, 1);
        mistB.position.set(0, -mB.h + mB.h * 2 * 0.1, -8.6);

        const t = half(-7);
        const treeH = Math.min(t.h * 2 * 0.78, t.w * 2 * 1.5);
        const treeW = (treeH * 512) / 768;
        const tx = Math.min(t.w * 0.74, t.w - treeW * 0.3);
        deadTree.scale.set(treeW, treeH, 1);
        deadTree.position.set(tx, -t.h + t.h * 2 * 0.02 + treeH / 2, -7);

        const p = half(-6);
        const psc = clamp(p.w / 12, 0.6, 1);
        for (const pk of pumpkins) {
          const w = pk.size * psc;
          pk.spr.scale.set(w, w, 1);
          pk.spr.position.set(pk.u * p.w, -p.h + p.h * 2 * 0.055 + w * 0.45, -6);
          pk.pool.scale.set(w * 2.4, w * 0.9, 1);
          pk.pool.position.set(pk.u * p.w, -p.h + p.h * 2 * 0.05, -6.1);
        }

        const g = half(-2);
        const sc = clamp(g.w / 12, 0.6, 1);
        const webS = Math.min(g.h * 2 * 0.42, g.w * 2 * 0.6);
        web.scale.set(webS, webS, 1);
        web.position.set(g.w - webS / 2, g.h - webS / 2, -2);
        for (const s of spiders) {
          s.ax = s.u * g.w;
          s.ay = g.h + 0.5;
          s.sc = sc;
          s.spr.scale.set(s.size * sc, s.size * sc * 1.5, 1);
        }
      };

      const frame = (t: number) => {
        lastT = t;
        for (const g of skyStars) g.mat.opacity = 0.4 + 0.35 * Math.sin(t * g.f + g.ph);
        // Occasional lightning flash: one slot in 11s, only some slots fire
        const slot = Math.floor(t / 11);
        const local = t - slot * 11;
        flash.material.opacity = hash(slot + 5) > 0.4 && local < 0.4 ? (local < 0.08 ? local / 0.08 : Math.exp(-(local - 0.08) * 9)) * (0.6 + 0.4 * Math.sin(local * 70)) * 0.22 : 0;

        const breath = Math.sin(t * 0.5);
        moon.position.y = moonY + Math.sin(t * 0.2) * 0.1;
        aura.material.opacity = 0.85 + breath * 0.1;
        aura.scale.setScalar(moonS * 2.9 * (1 + breath * 0.03));

        mistA.position.x = Math.sin(t * 0.05) * half(-10.4).w * 0.08;
        mistB.position.x = Math.sin(t * 0.04 + 2) * half(-8.6).w * 0.1;
        deadTree.material.rotation = Math.sin(t * 0.4) * 0.006;

        for (const pk of pumpkins) {
          const f = 0.86 + 0.14 * Math.sin(t * 9 + pk.ph) * Math.sin(t * 3.7 + pk.ph * 2);
          pk.spr.material.opacity = 0.9 + 0.1 * f;
          pk.pool.material.opacity = 0.34 * f;
        }

        for (const b of bats) {
          const h = half(b.z);
          const range = h.w * 2 + 6;
          const x = ((((b.off * range + t * b.speed) % range) + range) % range) - range / 2;
          b.spr.position.set(x, b.v * h.h + Math.sin(t * 0.8 + b.ph) * 1 + Math.sin(t * 2 + b.ph) * 0.3, b.z);
          b.spr.scale.set(b.size, b.size * 0.5, 1);
          b.spr.material.map = Math.sin(t * (9 + (b.ph % 3)) + b.ph) > 0 ? batUp : batDown;
          b.spr.material.rotation = Math.sin(t * 2 + b.ph) * 0.12;
        }

        for (const g of ghosts) {
          const h = half(g.z);
          const range = h.w * 2 + g.size * 2;
          const x = ((g.off * range + t * g.speed) % range) - range / 2;
          g.spr.position.set(x, g.v * h.h + Math.sin(t * 0.7 + g.ph) * 0.7, g.z);
          g.spr.scale.set(g.size * (1 + Math.sin(t * 1.4 + g.ph) * 0.04), g.size * 1.25, 1);
          g.spr.material.rotation = Math.sin(t * 0.6 + g.ph) * 0.1;
          g.spr.material.opacity = 0.55 + 0.2 * Math.sin(t * 0.9 + g.ph * 2);
        }

        for (const w of wisps) {
          const h = half(w.z);
          w.spr.position.set(w.u * h.w + Math.sin(t * 0.5 + w.ph) * 1.2 + Math.sin(t * 1.1 + w.ph * 2) * 0.3, w.v * h.h + Math.cos(t * 0.4 + w.ph * 1.3) * 0.9, w.z);
          const k = 0.5 + 0.5 * Math.sin(t * 1.3 + w.ph * 2);
          w.spr.material.opacity = 0.15 + 0.85 * k * k;
          w.spr.scale.setScalar(w.size * (0.8 + 0.4 * k));
        }

        const tp = threadGeo.attributes.position.array as Float32Array;
        spiders.forEach((s, i) => {
          const drop = s.len * s.sc * (0.75 + 0.25 * Math.sin(t * 0.5 + s.ph));
          const sh = s.size * s.sc * 1.5;
          s.spr.position.set(s.ax, s.ay - drop - sh * 0.0625, -2);
          s.spr.material.rotation = Math.sin(t * 1.1 + s.ph) * 0.06;
          tp.set([s.ax, s.ay, -2, s.ax, s.ay - drop, -2], i * 6);
        });
        threadGeo.attributes.position.needsUpdate = true;

        const lh = half(-3);
        const lrange = lh.h * 2 + 2;
        for (const g of leaves) {
          for (let i = 0; i < 30; i++) {
            const u = g.base[i * 3];
            const v = g.base[i * 3 + 1];
            const p = g.base[i * 3 + 2];
            g.arr[i * 3] = u * lh.w * 1.05 + Math.sin(t * 0.7 + p) * 1.2;
            g.arr[i * 3 + 1] = lh.h + 1 - ((v * lrange + t * (0.5 + (p % 1) * 0.6)) % lrange);
            g.arr[i * 3 + 2] = 0;
          }
          g.geo.attributes.position.needsUpdate = true;
        }
      };

      onResize = () => {
        layout();
        frame(lastT);
      };
      tick = (t) => {
        frame(t);
        parallax();
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
