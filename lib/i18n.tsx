"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DICT } from "./i18n-dict";

export type Lang = "vi" | "en";

type Dict = Record<string, { vi: string; en: string }>;

const defaultDict = DICT as unknown as Dict;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: keyof typeof DICT) => string };
const I18nCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");
  const [remote, setRemote] = useState<Dict | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fb-lang") as Lang | null;
      if (saved === "vi" || saved === "en") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/translations")
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.dict) setRemote(j.dict as Dict);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("fb-lang", l);
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);

  const merged = useMemo<Dict>(() => (remote ? { ...defaultDict, ...remote } : defaultDict), [remote]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key) => merged[key as string]?.[lang] ?? defaultDict[key as string]?.[lang] ?? String(key),
    }),
    [lang, setLang, merged],
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const v = useContext(I18nCtx);
  if (!v) throw new Error("useI18n outside provider");
  return v;
}
