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
      const moonGeo = new THREE.CircleGeometry(3.2, 64);
      const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff2c2, transparent: true, opacity: 0.85 });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(9, 6, -5);
      scene.add(moon);
      disposables.push(moonGeo, moonMat);

      const haloGeo = new THREE.RingGeometry(3.3, 5.2, 64);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.14, side: THREE.DoubleSide });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(moon.position);
      scene.add(halo);
      disposables.push(haloGeo, haloMat);

      const lanterns: { mesh: THREE.Mesh; sway: number; speed: number; base: THREE.Vector3 }[] = [];
      const lantGeo = new THREE.SphereGeometry(0.55, 24, 20);
      disposables.push(lantGeo);
      const colors = [0xe53935, 0xff5722, 0xf9a825, 0xd32f2f];
      for (let i = 0; i < 22; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.9 });
        disposables.push(mat);
        const m = new THREE.Mesh(lantGeo, mat);
        const base = new THREE.Vector3((Math.random() - 0.5) * 30, -6 - Math.random() * 4, (Math.random() - 0.5) * 8);
        m.position.copy(base);
        m.scale.setScalar(0.6 + Math.random() * 0.9);
        scene.add(m);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffb74d, transparent: true, opacity: 0.35 });
        disposables.push(lineMat);
        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.55, 0), new THREE.Vector3(0, 2.4, 0)]);
        disposables.push(lineGeo);
        const line = new THREE.Line(lineGeo, lineMat);
        m.add(line);
        lanterns.push({ mesh: m, sway: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5, base });
      }

      tick = (t) => {
        halo.rotation.z = t * 0.05;
        haloMat.opacity = 0.12 + Math.sin(t * 0.8) * 0.04;
        for (const l of lanterns) {
          l.mesh.position.y = l.base.y + ((t * l.speed) % 20);
          if (l.mesh.position.y > 10) l.mesh.position.y -= 20;
          l.mesh.position.x = l.base.x + Math.sin(t * 0.6 + l.sway) * 0.6;
          l.mesh.rotation.z = Math.sin(t * 0.7 + l.sway) * 0.15;
        }
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
