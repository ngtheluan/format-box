"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Tool } from "@/lib/tools-shared";

type Ctx = {
  tools: Tool[];
  loading: boolean;
  reload: () => void;
};

const ToolsCtx = createContext<Ctx>({ tools: [], loading: true, reload: () => {} });

export function ToolsProvider({ children }: { children: ReactNode }) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/tools", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setTools(j.tools ?? []))
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <ToolsCtx.Provider value={{ tools, loading, reload: load }}>{children}</ToolsCtx.Provider>
  );
}

export function useTools(): Tool[] {
  return useContext(ToolsCtx).tools;
}

export function useToolsState(): Ctx {
  return useContext(ToolsCtx);
}
