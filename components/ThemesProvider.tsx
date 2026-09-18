"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { SEED_THEMES, type Theme } from "@/lib/themes-shared";

type Ctx = {
  themes: Theme[];
  loading: boolean;
  reload: () => Promise<void>;
};

const ThemesCtx = createContext<Ctx>({ themes: SEED_THEMES, loading: false, reload: async () => {} });

export function ThemesProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<Theme[]>(SEED_THEMES);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/themes", { cache: "no-store" });
      const j = await r.json();
      setThemes(j.themes ?? []);
    } catch {
      /* keep seed */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("fb-themes") : null;
    if (bc) bc.onmessage = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      bc?.close();
    };
  }, [load]);

  return <ThemesCtx.Provider value={{ themes, loading, reload: load }}>{children}</ThemesCtx.Provider>;
}

export function useThemes(): Theme[] {
  return useContext(ThemesCtx).themes;
}

export function useThemesState(): Ctx {
  return useContext(ThemesCtx);
}

export function useEnabledThemes(): Theme[] {
  return useThemes().filter((t) => t.enabled || t.id === "modern");
}
