"use client";
import { useEffect, useMemo, useState } from "react";
import { IconCopy, IconRefresh, IconRestore } from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { Button, Input } from "@/components/ui";

type RGB = { r: number; g: number; b: number };

function clamp(n: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, n));
}

function parseColor(raw: string): { rgb: RGB; alpha: number } | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  let m = s.match(/^#?([0-9a-f]{3})$/i);
  if (m) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return { rgb: { r, g, b }, alpha: 1 };
  }
  m = s.match(/^#?([0-9a-f]{4})$/i);
  if (m) {
    const [r, g, b, a] = m[1].split("").map((c) => parseInt(c + c, 16));
    return { rgb: { r, g, b }, alpha: a / 255 };
  }
  m = s.match(/^#?([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return { rgb: { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }, alpha: 1 };
  }
  m = s.match(/^#?([0-9a-f]{8})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return {
      rgb: { r: (n >>> 24) & 255, g: (n >> 16) & 255, b: (n >> 8) & 255 },
      alpha: (n & 255) / 255,
    };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/);
  if (m) {
    const r = clamp(Math.round(parseFloat(m[1])));
    const g = clamp(Math.round(parseFloat(m[2])));
    const b = clamp(Math.round(parseFloat(m[3])));
    let a = 1;
    if (m[4] != null) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { rgb: { r, g, b }, alpha: Math.min(1, Math.max(0, a)) };
  }
  m = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.%]+))?\s*\)$/);
  if (m) {
    const h = parseFloat(m[1]);
    const sat = parseFloat(m[2]);
    const l = parseFloat(m[3]);
    let a = 1;
    if (m[4] != null) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { rgb: hslToRgb(h, sat, l), alpha: Math.min(1, Math.max(0, a)) };
  }
  return null;
}

function rgbToHex({ r, g, b }: RGB) {
  const h = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHex8({ r, g, b }: RGB, a: number) {
  const h = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}${h(a * 255)}`;
}

function rgbToHsl({ r, g, b }: RGB) {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0,
    s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return {
    r: clamp(Math.round((r + m) * 255)),
    g: clamp(Math.round((g + m) * 255)),
    b: clamp(Math.round((b + m) * 255)),
  };
}

function rgbToHsv({ r, g, b }: RGB) {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, v: v * 100 };
}

function rgbToOklch({ r, g, b }: RGB) {
  const toLin = (u: number) => {
    const c = u / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = toLin(r),
    G = toLin(g),
    B = toLin(b);
  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(a * a + bLab * bLab);
  let H = (Math.atan2(bLab, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: H };
}

function relLuminance({ r, g, b }: RGB) {
  const c = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

function contrastRatio(a: RGB, b: RGB) {
  const l1 = relLuminance(a);
  const l2 = relLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function fmt(n: number, d = 0) {
  return n.toFixed(d);
}

export default function ColorTool() {
  const toast = useToast();
  const { t } = useI18n();

  const [raw, setRaw] = useState("#3b82f6");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const parsed = useMemo(() => parseColor(raw), [raw]);
  const rgb = parsed?.rgb ?? { r: 59, g: 130, b: 246 };
  const alpha = parsed?.alpha ?? 1;
  const valid = parsed != null;

  const hex = rgbToHex(rgb);
  const hex8 = rgbToHex8(rgb, alpha);
  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  const oklch = rgbToOklch(rgb);

  const cards = useMemo(
    () => [
      { key: "hex", title: "HEX", value: hex.toUpperCase() },
      { key: "hex8", title: "HEX + Alpha", value: hex8.toUpperCase() },
      {
        key: "rgb",
        title: "RGB",
        value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      },
      {
        key: "rgba",
        title: "RGBA",
        value: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${+alpha.toFixed(3)})`,
      },
      {
        key: "hsl",
        title: "HSL",
        value: `hsl(${fmt(hsl.h)}, ${fmt(hsl.s, 1)}%, ${fmt(hsl.l, 1)}%)`,
      },
      {
        key: "hsla",
        title: "HSLA",
        value: `hsla(${fmt(hsl.h)}, ${fmt(hsl.s, 1)}%, ${fmt(hsl.l, 1)}%, ${+alpha.toFixed(3)})`,
      },
      {
        key: "hsb",
        title: "HSB / HSV",
        value: `hsb(${fmt(hsv.h)}, ${fmt(hsv.s, 1)}%, ${fmt(hsv.v, 1)}%)`,
      },
      {
        key: "oklch",
        title: "OKLCH",
        value: `oklch(${fmt(oklch.l * 100, 2)}% ${fmt(oklch.c, 4)} ${fmt(oklch.h, 2)})`,
      },
    ],
    [hex, hex8, rgb, alpha, hsl, hsv, oklch],
  );

  const shades = useMemo(() => {
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };
    const steps = [0.9, 0.75, 0.55, 0.35, 0.15, 0, 0.15, 0.35, 0.55, 0.75];
    return steps.map((v, i) => {
      const c = i < 5 ? mix(rgb, white, v) : i === 5 ? rgb : mix(rgb, black, v);
      const label = i < 5 ? `+${Math.round(v * 100)}%` : i === 5 ? "base" : `−${Math.round(v * 100)}%`;
      return { rgb: c, hex: rgbToHex(c), label };
    });
  }, [rgb]);

  const contrastWhite = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
  const contrastBlack = contrastRatio(rgb, { r: 0, g: 0, b: 0 });
  const grade = (r: number) =>
    r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA Large" : "Fail";

  const copy = (v: string) => {
    if (!v) return;
    navigator.clipboard.writeText(v).then(() => toast(t("toast_copied")));
  };

  const randomize = () => {
    const rand = () => Math.floor(Math.random() * 256);
    setRaw(rgbToHex({ r: rand(), g: rand(), b: rand() }).toUpperCase());
  };

  if (!mounted) return <div className="tc-tool" />;

  const swatchStyle: React.CSSProperties = {
    width: 40,
    height: 34,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
    backgroundSize: "8px 8px",
    backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
  };

  return (
    <div className="tc-tool">
      <div className="tc-input-wrap">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={swatchStyle} title={t("cl_preview")}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`,
              }}
            />
          </div>
          <input
            type="color"
            value={hex}
            onChange={(e) => setRaw(e.target.value.toUpperCase())}
            style={{
              width: 34,
              height: 34,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--bg2)",
              cursor: "pointer",
              padding: 3,
            }}
            title={t("cl_pick")}
          />
          <Input
            style={{ flex: "1 1 220px", minWidth: 180, fontFamily: "var(--mono)" }}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="#3b82f6 · rgb(...) · hsl(...)"
            spellCheck={false}
          />
          <Button
            size="sm"
            variant="subtle"
            onClick={randomize}
            leftIcon={<IconRefresh size={14} stroke={1.9} />}
          >
            {t("cl_random")}
          </Button>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setRaw("#3b82f6")}
            leftIcon={<IconRestore size={14} stroke={1.9} />}
          >
            {t("cl_reset")}
          </Button>
        </div>
        {raw.trim() && !valid && (
          <p className="info" style={{ color: "var(--danger, #ef4444)", marginTop: 6 }}>
            {t("cl_invalid")}
          </p>
        )}
      </div>

      <div className="tc-grid">
        {cards.map((r) => (
          <button
            key={r.key}
            className="tc-card"
            onClick={() => copy(r.value)}
            type="button"
            title={t("tc_click_copy")}
          >
            <div className="tc-card-head">
              <div className="tc-card-name">
                <b>{r.title}</b>
              </div>
              <IconCopy size={14} stroke={1.9} className="tc-card-copy" />
            </div>
            <div className="tc-card-value">{r.value}</div>
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 12,
        }}
      >
        <div className="tc-input-wrap">
          <label>{t("cl_shades")}</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
              gap: 4,
            }}
          >
            {shades.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => copy(s.hex.toUpperCase())}
                title={`${s.hex.toUpperCase()} · ${s.label}`}
                style={{
                  background: s.hex,
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  height: 44,
                  cursor: "pointer",
                  padding: 0,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    bottom: 3,
                    left: 0,
                    right: 0,
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    textAlign: "center",
                    color: relLuminance(s.rgb) > 0.5 ? "#000" : "#fff",
                    opacity: 0.85,
                  }}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="tc-input-wrap">
          <label>{t("cl_contrast")}</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { bg: "#ffffff", fg: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, ratio: contrastWhite, label: t("cl_on_white") },
              { bg: "#000000", fg: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, ratio: contrastBlack, label: t("cl_on_black") },
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  background: c.bg,
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  minHeight: 44,
                }}
              >
                <div style={{ color: c.fg, fontSize: 16, fontWeight: 700, fontFamily: "var(--mono)", lineHeight: 1.2 }}>
                  Aa
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: c.fg,
                    opacity: 0.9,
                    lineHeight: 1.3,
                  }}
                >
                  {c.ratio.toFixed(2)}:1 · {grade(c.ratio)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
