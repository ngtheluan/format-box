"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SKIN_STORAGE, type Skin } from "./theme";

type Ctx = { skin: Skin; setSkin: (s: Skin, opts?: { persist?: boolean }) => void };
const SkinCtx = createContext<Ctx>({ skin: "modern", setSkin: () => {} });

export function SkinProvider({ children }: { children: React.ReactNode }) {
  const [skin, setSkinState] = useState<Skin>("modern");

  useEffect(() => {
    const saved =
      (localStorage.getItem(SKIN_STORAGE.userChoice) as Skin | null) ??
      (localStorage.getItem(SKIN_STORAGE.default) as Skin | null) ??
      "modern";
    setSkinState(saved);
    applyDataset(saved);
  }, []);

  const setSkin = useCallback((s: Skin, opts?: { persist?: boolean }) => {
    setSkinState(s);
    applyDataset(s);
    if (opts?.persist === false) return;
    try {
      localStorage.setItem(SKIN_STORAGE.userChoice, s);
    } catch {}
  }, []);

  return <SkinCtx.Provider value={{ skin, setSkin }}>{children}</SkinCtx.Provider>;
}

export const useSkin = () => useContext(SkinCtx);

function applyDataset(s: Skin) {
  if (s === "modern") delete document.documentElement.dataset.skin;
  else document.documentElement.dataset.skin = s;
}
