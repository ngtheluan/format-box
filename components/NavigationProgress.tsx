"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";

function Bar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raf = useRef<number | null>(null);
  const prev = useRef(pathname + searchParams.toString());

  useEffect(() => {
    const key = pathname + searchParams.toString();
    if (key === prev.current) return;
    prev.current = key;

    // Navigation complete — finish bar
    setProgress(100);
    const hide = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
    return () => clearTimeout(hide);
  }, [pathname, searchParams]);

  // Start bar on link click via capture
  useEffect(() => {
    const onStart = () => {
      if (timer.current) clearTimeout(timer.current);
      if (raf.current) cancelAnimationFrame(raf.current);
      setProgress(0);
      setVisible(true);
      // Animate to ~85% quickly then slow down
      let p = 0;
      const tick = () => {
        p = p < 30 ? p + 8 : p < 60 ? p + 3 : p < 80 ? p + 1 : p < 85 ? p + 0.3 : p;
        if (p < 85) {
          setProgress(p);
          raf.current = requestAnimationFrame(tick);
        }
      };
      raf.current = requestAnimationFrame(tick);
    };

    document.addEventListener("click", (e) => {
      const a = (e.target as Element)?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("#")) return;
      onStart();
    });
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: 2,
        width: `${progress}%`,
        background: "var(--accent, #6366f1)",
        transition: progress === 100 ? "width 0.1s ease, opacity 0.3s ease" : "width 0.15s ease",
        opacity: visible ? 1 : 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    />
  );
}

export default function NavigationProgress() {
  return (
    <Suspense>
      <Bar />
    </Suspense>
  );
}
