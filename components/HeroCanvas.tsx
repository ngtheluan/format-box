"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const accent = new THREE.Color("#6366f1");
    const accent2 = new THREE.Color("#a78bfa");

    // Central wireframe icosahedron
    const geom = new THREE.IcosahedronGeometry(1.6, 1);
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geom),
      new THREE.LineBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.35,
      })
    );
    scene.add(wire);

    // Inner glowing solid (very translucent)
    const solid = new THREE.Mesh(
      geom,
      new THREE.MeshBasicMaterial({
        color: accent2,
        transparent: true,
        opacity: 0.04,
      })
    );
    scene.add(solid);

    // Orbiting particle ring
    const N = 260;
    const positions = new Float32Array(N * 3);
    const speeds = new Float32Array(N);
    const radii = new Float32Array(N);
    const phases = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = 2.4 + Math.random() * 2.2;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 3.2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a) * r;
      radii[i] = r;
      phases[i] = a;
      speeds[i] = 0.04 + Math.random() * 0.09;
    }
    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      pGeom,
      new THREE.PointsMaterial({
        color: accent,
        size: 0.035,
        transparent: true,
        opacity: 0.75,
        sizeAttenuation: true,
      })
    );
    scene.add(particles);

    // Pointer tracking (gentle)
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 0.4;
    };
    window.addEventListener("pointermove", onMove);

    // Resize handling
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

      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;

      if (!reduce) {
        wire.rotation.y = t * 0.15 + current.x;
        wire.rotation.x = Math.sin(t * 0.2) * 0.15 + current.y;
        solid.rotation.copy(wire.rotation);
        particles.rotation.y = t * 0.03;

        const arr = pGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < N; i++) {
          const a = phases[i] + t * speeds[i];
          arr[i * 3] = Math.cos(a) * radii[i];
          arr[i * 3 + 2] = Math.sin(a) * radii[i];
        }
        pGeom.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      geom.dispose();
      pGeom.dispose();
      (wire.material as THREE.Material).dispose();
      (solid.material as THREE.Material).dispose();
      (particles.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="hero-canvas" aria-hidden="true" />;
}
