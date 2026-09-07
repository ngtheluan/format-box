"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconPaperclip,
  IconDownload,
  IconX,
  IconCopy,
  IconCode,
  IconBraces,
} from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { Button, Input, Select } from "@/components/ui";

type Fit = "cover" | "contain";
type SnippetTab = "html" | "manifest";

type SizeSpec = { size: number; filename: string; hint: string };

const SIZES: SizeSpec[] = [
  { size: 16, filename: "favicon-16x16.png", hint: "Tab" },
  { size: 32, filename: "favicon-32x32.png", hint: "Tab HiDPI" },
  { size: 48, filename: "favicon-48x48.png", hint: "Windows" },
  { size: 64, filename: "favicon-64x64.png", hint: "" },
  { size: 96, filename: "favicon-96x96.png", hint: "Android" },
  { size: 128, filename: "favicon-128x128.png", hint: "" },
  { size: 180, filename: "apple-touch-icon.png", hint: "iOS" },
  { size: 192, filename: "android-chrome-192x192.png", hint: "PWA" },
  { size: 256, filename: "favicon-256x256.png", hint: "" },
  { size: 512, filename: "android-chrome-512x512.png", hint: "PWA XL" },
];

const HTML_SNIPPET = `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;

const MANIFEST = `{
  "name": "",
  "short_name": "",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}`;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type);
  });
}

async function renderIcon(
  img: HTMLImageElement,
  size: number,
  fit: Fit,
  bg: string,
  padding: number,
  radius: number,
): Promise<{ url: string; blob: Blob }> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no ctx");

  if (bg !== "transparent") {
    if (radius > 0) {
      const r = (radius / 100) * (size / 2);
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.arcTo(size, 0, size, size, r);
      ctx.arcTo(size, size, 0, size, r);
      ctx.arcTo(0, size, 0, 0, r);
      ctx.arcTo(0, 0, size, 0, r);
      ctx.closePath();
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.clip();
    } else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
    }
  }

  const pad = (padding / 100) * size;
  const box = size - pad * 2;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = fit === "cover" ? Math.max(box / iw, box / ih) : Math.min(box / iw, box / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, dw, dh);

  const blob = await canvasToBlob(canvas, "image/png");
  return { url: URL.createObjectURL(blob), blob };
}

type Result = { size: number; filename: string; hint: string; url: string; blob: Blob };

export default function FaviconExportTool() {
  const toast = useToast();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [srcName, setSrcName] = useState<string>("");
  const [srcW, setSrcW] = useState(0);
  const [srcH, setSrcH] = useState(0);

  const [fit, setFit] = useState<Fit>("contain");
  const [bg, setBg] = useState<string>("transparent");
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [padding, setPadding] = useState<number>(0);
  const [radius, setRadius] = useState<number>(0);

  const [results, setResults] = useState<Result[]>([]);
  const [processing, setProcessing] = useState(false);

  const [snippetTab, setSnippetTab] = useState<SnippetTab>("html");
  const [snippetOpen, setSnippetOpen] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.from(files).find((f) => f.type.startsWith("image/"));
      if (!file) {
        toast(t("toast_only_images"));
        return;
      }
      if (srcUrl) URL.revokeObjectURL(srcUrl);
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        setSrcUrl(url);
        setSrcName(file.name);
        setSrcW(img.naturalWidth);
        setSrcH(img.naturalHeight);
      } catch {
        toast(t("toast_invalid_data"));
      }
    },
    [srcUrl, toast, t],
  );

  const reset = () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setSrcUrl(null);
    setSrcName("");
    setSrcW(0);
    setSrcH(0);
    setResults([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const bgFinal = bg === "transparent" ? "transparent" : bgColor;

  useEffect(() => {
    if (!srcUrl) return;
    let cancelled = false;
    setProcessing(true);
    const h = setTimeout(async () => {
      try {
        const img = await loadImage(srcUrl);
        const out: Result[] = [];
        for (const s of SIZES) {
          const { url, blob } = await renderIcon(img, s.size, fit, bgFinal, padding, radius);
          out.push({ size: s.size, filename: s.filename, hint: s.hint, url, blob });
        }
        if (cancelled) {
          out.forEach((r) => URL.revokeObjectURL(r.url));
          return;
        }
        setResults((prev) => {
          prev.forEach((r) => URL.revokeObjectURL(r.url));
          return out;
        });
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcUrl, fit, bgFinal, padding, radius]);

  const downloadOne = (r: Result) => {
    const a = document.createElement("a");
    a.href = r.url;
    a.download = r.filename;
    a.click();
  };

  const downloadAll = () => {
    if (results.length === 0) return;
    results.forEach((r, idx) => setTimeout(() => downloadOne(r), idx * 100));
    toast(t("toast_download_ok"));
  };

  const copySnippet = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast(t("toast_copied")));
  };

  const totalSize = useMemo(() => results.reduce((s, r) => s + r.blob.size, 0), [results]);
  const fmtSize = (b: number) =>
    b > 1048576 ? (b / 1048576).toFixed(2) + " MB" : (b / 1024).toFixed(1) + " KB";

  const snippetText = snippetTab === "html" ? HTML_SNIPPET : MANIFEST;

  return (
    <>
      {!srcUrl && (
        <div
          className={`drop${dragging ? " drag" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <div className="drop-icon">
            <IconPaperclip size={32} stroke={1.5} />
          </div>
          <span>
            {t("fx_drop")} <u>{t("act_choose_file")}</u>
          </span>
          <br />
          <small style={{ color: "var(--dim)", marginTop: 6, display: "block" }}>
            {t("fx_drop_hint")}
          </small>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      )}

      {srcUrl && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 260px",
            gap: 16,
            alignItems: "start",
          }}
          className="fx-layout"
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px minmax(0, 1fr)",
                gap: 14,
                alignItems: "center",
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--panel)",
              }}
              className="fx-preview-row"
            >
              <div
                style={{
                  aspectRatio: "1 / 1",
                  background:
                    bgFinal === "transparent"
                      ? "repeating-conic-gradient(rgba(0,0,0,0.08) 0% 25%, transparent 25% 50%) 0 0 / 14px 14px"
                      : bgFinal,
                  borderRadius: radius > 0 ? `${radius}%` : 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  padding: `${padding}%`,
                }}
              >
                <img
                  src={srcUrl}
                  alt="source"
                  style={{ width: "100%", height: "100%", objectFit: fit }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                <div className="info-i" style={{ wordBreak: "break-all", fontSize: 12 }}>
                  {srcName}
                </div>
                <div>
                  <b>{srcW}×{srcH}</b> <span className="info-i">· {t("fx_source")}</span>
                </div>
                <div>
                  <b>{results.length}/{SIZES.length}</b>{" "}
                  <span className="info-i">
                    · {totalSize > 0 ? fmtSize(totalSize) : "…"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <Button
                    size="sm"
                    onClick={downloadAll}
                    disabled={results.length === 0 || processing}
                    leftIcon={<IconDownload size={13} stroke={2} />}
                  >
                    {t("fx_download_all")}
                  </Button>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={reset}
                    leftIcon={<IconX size={13} stroke={2} />}
                  >
                    {t("fx_reset")}
                  </Button>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
                gap: 8,
                marginTop: 10,
              }}
            >
              {(processing && results.length === 0 ? SIZES : results).map((r) => {
                const isResult = "url" in r;
                return (
                  <button
                    key={r.size}
                    type="button"
                    onClick={() => isResult && downloadOne(r as Result)}
                    title={isResult ? (r as Result).filename : ""}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: 8,
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--panel)",
                      cursor: isResult ? "pointer" : "default",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          "repeating-conic-gradient(rgba(0,0,0,0.06) 0% 25%, transparent 25% 50%) 0 0 / 10px 10px",
                        borderRadius: 4,
                      }}
                    >
                      {isResult ? (
                        <img
                          src={(r as Result).url}
                          alt=""
                          style={{
                            maxWidth: 44,
                            maxHeight: 44,
                            imageRendering: r.size < 48 ? "pixelated" : "auto",
                          }}
                        />
                      ) : (
                        <span className="info-i">…</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.2, textAlign: "center" }}>
                      <b>{r.size}</b>
                      {r.hint && (
                        <div className="info-i" style={{ fontSize: 10 }}>
                          {r.hint}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 10,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--panel)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    className={`fmt-btn${snippetTab === "html" ? " active" : ""}`}
                    onClick={() => {
                      setSnippetTab("html");
                      setSnippetOpen(true);
                    }}
                    style={{ padding: "4px 10px", fontSize: 12 }}
                  >
                    <IconCode size={13} stroke={1.8} /> HTML
                  </button>
                  <button
                    className={`fmt-btn${snippetTab === "manifest" ? " active" : ""}`}
                    onClick={() => {
                      setSnippetTab("manifest");
                      setSnippetOpen(true);
                    }}
                    style={{ padding: "4px 10px", fontSize: 12 }}
                  >
                    <IconBraces size={13} stroke={1.8} /> manifest
                  </button>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => copySnippet(snippetText)}
                    leftIcon={<IconCopy size={13} stroke={1.9} />}
                  >
                    {t("act_copy")}
                  </Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => setSnippetOpen((v) => !v)}
                  >
                    {snippetOpen ? "▲" : "▼"}
                  </Button>
                </div>
              </div>
              {snippetOpen && (
                <pre
                  style={{
                    margin: 0,
                    borderTop: "1px solid var(--border)",
                    padding: 10,
                    fontSize: 11.5,
                    lineHeight: 1.5,
                    overflow: "auto",
                    maxHeight: 160,
                  }}
                >
                  {snippetText}
                </pre>
              )}
            </div>
          </div>

          <aside
            style={{
              position: "sticky",
              top: 76,
              border: "1px solid var(--border)",
              borderRadius: 10,
              background: "var(--panel)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            className="fx-panel"
          >
            <div>
              <label className="imgx-label">{t("fx_fit")}</label>
              <div className="row" style={{ marginTop: 4 }}>
                <button
                  className={`fmt-btn${fit === "contain" ? " active" : ""}`}
                  onClick={() => setFit("contain")}
                >
                  {t("fx_fit_contain")}
                </button>
                <button
                  className={`fmt-btn${fit === "cover" ? " active" : ""}`}
                  onClick={() => setFit("cover")}
                >
                  {t("fx_fit_cover")}
                </button>
              </div>
            </div>

            <div>
              <label className="imgx-label">{t("fx_bg")}</label>
              <Select
                selectSize="sm"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                options={[
                  { value: "transparent", label: t("fx_bg_transparent") },
                  { value: "color", label: t("fx_bg_color") },
                ]}
              />
              {bg === "color" && (
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="imgx-color"
                  />
                  <Input
                    inputSize="sm"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    monospace
                  />
                </div>
              )}
            </div>

            <div>
              <label className="imgx-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t("fx_padding")}</span>
                <span className="imgx-hint">{padding}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={30}
                value={padding}
                onChange={(e) => setPadding(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label className="imgx-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t("fx_radius")}</span>
                <span className="imgx-hint">{radius}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{ width: "100%" }}
                disabled={bg === "transparent"}
              />
              {bg === "transparent" && (
                <span className="imgx-hint">{t("fx_radius_need_bg")}</span>
              )}
            </div>
          </aside>

          <style jsx>{`
            @media (max-width: 900px) {
              .fx-layout {
                grid-template-columns: 1fr !important;
              }
              .fx-panel {
                position: static !important;
              }
              .fx-preview-row {
                grid-template-columns: 120px minmax(0, 1fr) !important;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
