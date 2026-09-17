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

    if (effectiveSkin === "mid-autumn") {
      // Helper: create a canvas-backed texture
      const makeTex = (size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const ctx = c.getContext("2d")!;
        draw(ctx, size);
        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 4;
        disposables.push(tex);
        return tex;
      };

      // Soft moon aura (large, behind moon)
      const auraTex = makeTex(512, (ctx, s) => {
        const cx = s / 2;
        const g = ctx.createRadialGradient(cx, cx, s / 10, cx, cx, s / 2);
        g.addColorStop(0, "rgba(255, 225, 150, 0.5)");
        g.addColorStop(0.35, "rgba(255, 200, 110, 0.22)");
        g.addColorStop(0.7, "rgba(255, 170, 80, 0.06)");
        g.addColorStop(1, "rgba(255, 170, 80, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      });
      const auraMat = new THREE.SpriteMaterial({ map: auraTex, transparent: true, depthWrite: false });
      disposables.push(auraMat);
      const aura = new THREE.Sprite(auraMat);
      aura.position.set(9, 6, -7);
      aura.scale.setScalar(22);
      scene.add(aura);

      // Moon disc (rendered as a beautiful gradient sprite)
      const moonTex = makeTex(512, (ctx, s) => {
        const cx = s / 2;
        const g = ctx.createRadialGradient(cx - 60, cx - 70, 20, cx, cx, s / 2 - 10);
        g.addColorStop(0, "#fffef2");
        g.addColorStop(0.4, "#fff2c2");
        g.addColorStop(0.78, "#ffd680");
        g.addColorStop(0.98, "rgba(255, 190, 100, 0.4)");
        g.addColorStop(1, "rgba(255, 190, 100, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cx, s / 2 - 10, 0, Math.PI * 2);
        ctx.fill();
        // Craters (deterministic-ish)
        const seed = [
          [0.32, 0.28, 0.05],
          [0.62, 0.4, 0.04],
          [0.48, 0.62, 0.055],
          [0.72, 0.68, 0.035],
          [0.38, 0.72, 0.028],
          [0.58, 0.22, 0.03],
        ];
        for (const [u, v, r] of seed) {
          const x = u * s;
          const y = v * s;
          const rr = r * s;
          const cg = ctx.createRadialGradient(x, y, 0, x, y, rr);
          cg.addColorStop(0, "rgba(200, 160, 90, 0.28)");
          cg.addColorStop(1, "rgba(200, 160, 90, 0)");
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(x, y, rr, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      const moonMat = new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false });
      disposables.push(moonMat);
      const moon = new THREE.Sprite(moonMat);
      moon.position.set(9, 6, -6);
      moon.scale.setScalar(9);
      scene.add(moon);

      // Silhouette of a distant mountain / pagoda skyline (adds depth)
      const skylineTex = makeTex(1024, (ctx, s) => {
        ctx.clearRect(0, 0, s, s);
        ctx.fillStyle = "rgba(30, 15, 40, 0.55)";
        ctx.beginPath();
        ctx.moveTo(0, s);
        const peaks = 7;
        for (let i = 0; i <= peaks; i++) {
          const x = (i / peaks) * s;
          const y = s * (0.55 + Math.sin(i * 1.7) * 0.12 + (i % 2 === 0 ? 0.1 : 0));
          ctx.lineTo(x, y);
        }
        ctx.lineTo(s, s);
        ctx.closePath();
        ctx.fill();
        // Pagoda
        ctx.fillStyle = "rgba(20, 10, 30, 0.75)";
        const px = s * 0.68;
        const py = s * 0.52;
        for (let i = 0; i < 4; i++) {
          const w = 90 - i * 15;
          const h = 22;
          ctx.fillRect(px - w / 2, py + i * 30, w, h);
          // eaves
          ctx.beginPath();
          ctx.moveTo(px - w / 2 - 10, py + i * 30);
          ctx.lineTo(px + w / 2 + 10, py + i * 30);
          ctx.lineTo(px + w / 2 - 5, py + i * 30 - 8);
          ctx.lineTo(px - w / 2 + 5, py + i * 30 - 8);
          ctx.closePath();
          ctx.fill();
        }
        // spire
        ctx.beginPath();
        ctx.moveTo(px, py - 30);
        ctx.lineTo(px - 6, py);
        ctx.lineTo(px + 6, py);
        ctx.closePath();
        ctx.fill();
      });
      const skylineMat = new THREE.SpriteMaterial({ map: skylineTex, transparent: true, depthWrite: false, opacity: 0.7 });
      disposables.push(skylineMat);
      const skyline = new THREE.Sprite(skylineMat);
      skyline.position.set(0, -6, -8);
      skyline.scale.set(50, 25, 1);
      scene.add(skyline);

      // Lantern texture (elegant round Chinese lantern with glow)
      const lanternTex = (hue: number) =>
        makeTex(256, (ctx, s) => {
          const cx = s / 2;
          // Outer glow
          const glow = ctx.createRadialGradient(cx, cx, 20, cx, cx, s / 2);
          glow.addColorStop(0, `hsla(${hue}, 95%, 65%, 0.5)`);
          glow.addColorStop(0.4, `hsla(${hue}, 90%, 55%, 0.18)`);
          glow.addColorStop(1, `hsla(${hue}, 90%, 50%, 0)`);
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, s, s);
          // Lantern body (ellipse)
          ctx.save();
          ctx.translate(cx, cx);
          ctx.scale(0.82, 1);
          const bg = ctx.createRadialGradient(-24, -32, 6, 0, 0, 82);
          bg.addColorStop(0, `hsl(${hue}, 100%, 78%)`);
          bg.addColorStop(0.55, `hsl(${hue}, 88%, 52%)`);
          bg.addColorStop(1, `hsl(${hue}, 82%, 34%)`);
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(0, 0, 78, 0, Math.PI * 2);
          ctx.fill();
          // Ribs
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
          // Caps
          ctx.fillStyle = "#3a1c0e";
          ctx.fillRect(cx - 32, cx - 92, 64, 12);
          ctx.fillRect(cx - 32, cx + 80, 64, 12);
          ctx.fillStyle = "#5a2a14";
          ctx.fillRect(cx - 26, cx - 96, 52, 6);
          ctx.fillRect(cx - 26, cx + 90, 52, 6);
          // String upward
          ctx.strokeStyle = "rgba(255, 200, 120, 0.55)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cx - 96);
          ctx.lineTo(cx, 6);
          ctx.stroke();
          // Tassel
          ctx.strokeStyle = "#f4c94a";
          ctx.lineWidth = 2;
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 4, cx + 96);
            ctx.lineTo(cx + i * 2, cx + 120);
            ctx.stroke();
          }
          ctx.fillStyle = "#c9832b";
          ctx.beginPath();
          ctx.arc(cx, cx + 96, 5, 0, Math.PI * 2);
          ctx.fill();
        });

      const hues = [355, 8, 20, 38, 355, 12, 28, 45];
      const lanterns: { spr: THREE.Sprite; sway: number; speed: number; base: THREE.Vector3; size: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const hue = hues[i % hues.length];
        const mat = new THREE.SpriteMaterial({ map: lanternTex(hue), transparent: true, depthWrite: false });
        disposables.push(mat);
        const spr = new THREE.Sprite(mat);
        const base = new THREE.Vector3(
          (Math.random() - 0.5) * 34,
          -12 - Math.random() * 6,
          (Math.random() - 0.5) * 8,
        );
        const size = 2.2 + Math.random() * 2;
        spr.scale.set(size, size, 1);
        spr.position.copy(base);
        scene.add(spr);
        lanterns.push({ spr, sway: Math.random() * Math.PI * 2, speed: 0.14 + Math.random() * 0.3, base, size });
      }

      // Mooncake texture (detailed rosette pattern)
      const mooncakeTex = makeTex(256, (ctx, s) => {
        const cx = s / 2;
        // Outer crust
        const outer = ctx.createRadialGradient(cx - 22, cx - 22, 10, cx, cx, 112);
        outer.addColorStop(0, "#e0a558");
        outer.addColorStop(0.65, "#a9631f");
        outer.addColorStop(1, "#5b2f0e");
        ctx.fillStyle = outer;
        ctx.beginPath();
        ctx.arc(cx, cx, 110, 0, Math.PI * 2);
        ctx.fill();
        // Scalloped edge notches
        for (let k = 0; k < 20; k++) {
          const a = (k / 20) * Math.PI * 2;
          const x = cx + Math.cos(a) * 104;
          const y = cx + Math.sin(a) * 104;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
          g.addColorStop(0, "rgba(90, 45, 15, 0.55)");
          g.addColorStop(1, "rgba(90, 45, 15, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
        }
        // Top face
        const top = ctx.createRadialGradient(cx - 18, cx - 22, 8, cx, cx, 92);
        top.addColorStop(0, "#f2c47a");
        top.addColorStop(1, "#b87528");
        ctx.fillStyle = top;
        ctx.beginPath();
        ctx.arc(cx, cx, 90, 0, Math.PI * 2);
        ctx.fill();
        // Rosette petals
        ctx.fillStyle = "rgba(107, 55, 18, 0.85)";
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          ctx.save();
          ctx.translate(cx + Math.cos(a) * 32, cx + Math.sin(a) * 32);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // Center dot
        ctx.fillStyle = "#6b3712";
        ctx.beginPath();
        ctx.arc(cx, cx, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4d18a";
        ctx.beginPath();
        ctx.arc(cx - 4, cx - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        // Border ring
        ctx.strokeStyle = "rgba(80, 40, 15, 0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cx, 90, 0, Math.PI * 2);
        ctx.stroke();
      });

      const mooncakes: { spr: THREE.Sprite; spin: number; base: THREE.Vector3 }[] = [];
      for (let i = 0; i < 5; i++) {
        const mat = new THREE.SpriteMaterial({ map: mooncakeTex, transparent: true, depthWrite: false });
        disposables.push(mat);
        const spr = new THREE.Sprite(mat);
        const base = new THREE.Vector3(
          -15 + i * 7 + (Math.random() - 0.5) * 2,
          -3 + (Math.random() - 0.5) * 4,
          -3 - Math.random() * 2,
        );
        const size = 1.6 + Math.random() * 0.6;
        spr.scale.set(size, size, 1);
        spr.position.copy(base);
        scene.add(spr);
        mooncakes.push({ spr, spin: Math.random() * Math.PI * 2, base });
      }

      // Cloud texture (soft warm mist)
      const cloudTex = makeTex(512, (ctx, s) => {
        ctx.clearRect(0, 0, s, s);
        for (let i = 0; i < 8; i++) {
          const x = (i / 8) * s + (Math.random() - 0.5) * 40;
          const y = s / 2 + (Math.random() - 0.5) * 40;
          const r = 50 + Math.random() * 70;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, "rgba(255, 240, 200, 0.35)");
          g.addColorStop(0.6, "rgba(255, 220, 160, 0.1)");
          g.addColorStop(1, "rgba(255, 220, 160, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      const clouds: { spr: THREE.Sprite; speed: number }[] = [];
      for (let i = 0; i < 5; i++) {
        const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false });
        disposables.push(mat);
        const spr = new THREE.Sprite(mat);
        spr.position.set((Math.random() - 0.5) * 44, 2 + Math.random() * 8, -7);
        spr.scale.set(16 + Math.random() * 8, 5, 1);
        scene.add(spr);
        clouds.push({ spr, speed: 0.2 + Math.random() * 0.3 });
      }

      // Stars (soft glowing points)
      const starTex = makeTex(64, (ctx, s) => {
        const c = s / 2;
        const g = ctx.createRadialGradient(c, c, 0, c, c, c);
        g.addColorStop(0, "rgba(255, 253, 230, 1)");
        g.addColorStop(0.3, "rgba(255, 230, 160, 0.7)");
        g.addColorStop(1, "rgba(255, 200, 100, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      });
      const S = 220;
      const sPos = new Float32Array(S * 3);
      for (let i = 0; i < S; i++) {
        sPos[i * 3] = (Math.random() - 0.5) * 60;
        sPos[i * 3 + 1] = (Math.random() - 0.5) * 32 + 3;
        sPos[i * 3 + 2] = -8 - Math.random() * 6;
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
      const sm = new THREE.PointsMaterial({
        map: starTex,
        size: 0.55,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const stars = new THREE.Points(sg, sm);
      scene.add(stars);
      disposables.push(sg, sm);

      // Sparkle particles rising with lanterns
      const P = 80;
      const pPos = new Float32Array(P * 3);
      const pSpeed = new Float32Array(P);
      for (let i = 0; i < P; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 40;
        pPos[i * 3 + 1] = -10 + Math.random() * 20;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
        pSpeed[i] = 0.5 + Math.random() * 1.2;
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const pm = new THREE.PointsMaterial({
        map: starTex,
        size: 0.35,
        transparent: true,
        opacity: 0.75,
        color: 0xffd88a,
        depthWrite: false,
      });
      const sparks = new THREE.Points(pg, pm);
      scene.add(sparks);
      disposables.push(pg, pm);

      tick = (t) => {
        moonMat.opacity = 0.9 + Math.sin(t * 0.5) * 0.06;
        aura.scale.setScalar(22 + Math.sin(t * 0.45) * 1.5);
        auraMat.opacity = 0.85 + Math.sin(t * 0.5) * 0.1;
        sm.opacity = 0.55 + Math.sin(t * 1.4) * 0.3;
        for (const l of lanterns) {
          l.spr.position.y = l.base.y + ((t * l.speed * 0.7) % 26);
          if (l.spr.position.y > 14) l.spr.position.y -= 26;
          l.spr.position.x = l.base.x + Math.sin(t * 0.4 + l.sway) * 0.9;
          const bob = 1 + Math.sin(t * 1.4 + l.sway) * 0.03;
          l.spr.scale.set(l.size * bob, l.size * bob, 1);
          l.spr.material.rotation = Math.sin(t * 0.5 + l.sway) * 0.08;
        }
        for (const m of mooncakes) {
          m.spr.position.y = m.base.y + Math.sin(t * 0.4 + m.spin) * 0.4;
          m.spr.material.rotation = Math.sin(t * 0.3 + m.spin) * 0.25;
        }
        for (const c of clouds) {
          c.spr.position.x += c.speed * 0.02;
          if (c.spr.position.x > 26) c.spr.position.x = -26;
        }
        const arr = pg.attributes.position.array as Float32Array;
        for (let i = 0; i < P; i++) {
          arr[i * 3 + 1] += 0.01 * pSpeed[i];
          arr[i * 3] += Math.sin(t + i) * 0.003;
          if (arr[i * 3 + 1] > 12) arr[i * 3 + 1] = -12;
        }
        pg.attributes.position.needsUpdate = true;
        pm.opacity = 0.55 + Math.sin(t * 2) * 0.2;
      };
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
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
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
