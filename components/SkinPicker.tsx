"use client";
import { useI18n } from "@/lib/i18n";
import { useSkin } from "@/lib/skin-context";
import type { Skin } from "@/lib/theme";
import { IconCheck, IconSparkles } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEnabledThemes } from "./ThemesProvider";

export default function SkinPicker() {
  const { lang } = useI18n();
  const { skin, setSkin } = useSkin();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const enabledThemes = useEnabledThemes();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const visibleSkins = useMemo(() => enabledThemes, [enabledThemes]);

  const pick = (s: Skin) => {
    setSkin(s);
    setOpen(false);
  };

  return (
    <div className="skin-picker" ref={ref}>
      <button
        className="theme-btn"
        onClick={() => setOpen((v) => !v)}
        title={lang === "vi" ? "Chọn theme" : "Choose theme"}
        aria-label="Theme picker"
      >
        <IconSparkles size={18} stroke={1.8} />
      </button>
      {open && (
        <div className="skin-menu">
          <div className="skin-menu-h">{lang === "vi" ? "Theme" : "Themes"}</div>
          {visibleSkins.map((s) => (
            <button key={s.id} className={`skin-item${s.id === skin ? " active" : ""}`} onClick={() => pick(s.id)}>
              <span
                className="skin-swatch"
                aria-hidden
                style={{ background: `linear-gradient(135deg, ${s.swatch[0]}, ${s.swatch[1]})` }}
              />
              <span className="skin-label">{lang === "vi" ? s.nameVi : s.nameEn}</span>
              {s.id === skin && <IconCheck size={14} stroke={2.2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
