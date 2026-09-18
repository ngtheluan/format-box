"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SEED_TOOLS, type Tool } from "@/lib/tools-shared";

type Ctx = {
  tools: Tool[];
  loading: boolean;
  reload: () => void;
};

const ToolsCtx = createContext<Ctx>({ tools: SEED_TOOLS, loading: false, reload: () => {} });

export function ToolsProvider({ children }: { children: ReactNode }) {
  const [tools, setTools] = useState<Tool[]>(SEED_TOOLS);
  const [loading, setLoading] = useState(true);

  const load = (broadcast = false) => {
    setLoading(true);
    fetch("/api/tools", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setTools(j.tools ?? []))
      .catch(() => setTools([]))
      .finally(() => {
        setLoading(false);
        if (broadcast) {
          try { new BroadcastChannel("fb-tools").postMessage("reload"); } catch {}
        }
      });
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("fb-tools") : null;
    if (bc) bc.onmessage = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      bc?.close();
    };
  }, []);

  return (
    <ToolsCtx.Provider value={{ tools, loading, reload: () => load(true) }}>{children}</ToolsCtx.Provider>
  );
}

export function useTools(): Tool[] {
  return useContext(ToolsCtx).tools;
}

export function useToolsState(): Ctx {
  return useContext(ToolsCtx);
}
