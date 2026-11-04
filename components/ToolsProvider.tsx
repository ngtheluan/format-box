"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type Tool } from "@/lib/tools-shared";

type Ctx = {
  tools: Tool[];
  loading: boolean;
  reload: () => void;
};

const ToolsCtx = createContext<Ctx>({ tools: [], loading: false, reload: () => {} });

export function ToolsProvider({ children, initialTools = [] }: { children: ReactNode; initialTools?: Tool[] }) {
  const [tools, setTools] = useState<Tool[]>(initialTools);
  // When SSR already seeded tools we start non-loading; otherwise fetch kicks in.
  const [loading, setLoading] = useState(initialTools.length === 0);

  const load = (broadcast = false) => {
    setLoading(true);
    fetch("/api/tools")
      .then((r) => r.json())
      .then((j) => {
        const next: Tool[] = j.tools ?? [];
        setTools((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
      })
      .catch(() => setTools([]))
      .finally(() => {
        setLoading(false);
        if (broadcast) {
          try { new BroadcastChannel("fb-tools").postMessage("reload"); } catch {}
        }
      });
  };

  useEffect(() => {
    // SSR seeds the list; refetch only when admin broadcasts an update.
    // Focus/visibility refetching was making /api/tools fire on every tab
    // switch and inflating Supabase egress.
    if (initialTools.length === 0) load();
    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("fb-tools") : null;
    if (bc) bc.onmessage = () => load();
    return () => {
      bc?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
