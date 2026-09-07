"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconPaperclip,
  IconDownload,
  IconX,
  IconPlus,
  IconRotateClockwise,
  IconFlipHorizontal,
  IconFlipVertical,
  IconArrowsMaximize,
  IconPhoto,
} from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { Button, Slider, Select, Input } from "@/components/ui";

type Fmt = "image/png" | "image/jpeg" | "image/webp";
type ResizeMode = "none" | "width" | "percent";

type Item = {
  id: string;
  file: File;
  srcUrl: string;
  srcW: number;
  srcH: number;
  outUrl?: string;
  outSize?: number;
  outW?: number;
  outH?: number;
  ext?: string;
  processing?: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 10);

function fmtSize(b: number) {
  return b > 1048576 ? (b / 1048576).toFixed(2) + " MB" : (b / 1024).toFixed(1) + " KB";
}

function extOf(fmt: Fmt) {
  const raw = fmt.split("/")[1];
  return raw === "jpeg" ? "jpg" : raw;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      type,
      quality,
    );
  });
}

export default function ImageTool() {
  const toast = useToast();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [target, setTarget] = useState<Fmt>("image/webp");
  const [quality, setQuality] = useState(85);
  const [resizeMode, setResizeMode] = useState<ResizeMode>("none");
  const [resizeW, setResizeW] = useState(1600);
  const [resizePct, setResizePct] = useState(50);
  const [rotate, setRotate] = useState<0 | 90 | 180 | 270>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [bgColor, setBgColor] = useState("#ffffff");

  const [compareX, setCompareX] = useState(50);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || items[0] || null,
    [items, selectedId],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) {
        toast(t("toast_only_images"));
        return;
      }
      const loaded: Item[] = [];
      for (const file of list) {
        try {
          const url = URL.createObjectURL(file);
          const img = await loadImage(url);
          loaded.push({
            id: uid(),
            file,
            srcUrl: url,
            srcW: img.naturalWidth,
            srcH: img.naturalHeight,
          });
        } catch {
          /* skip */
        }
      }
      setItems((prev) => {
        const next = [...prev, ...loaded];
        if (!selectedId && loaded[0]) setSelectedId(loaded[0].id);
        return next;
      });
    },
    [toast, t, selectedId],
  );

  const processOne = useCallback(
    async (item: Item): Promise<Item> => {
      const img = await loadImage(item.srcUrl);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (resizeMode === "width" && resizeW > 0 && w > resizeW) {
        const scale = resizeW / w;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      } else if (resizeMode === "percent") {
        w = Math.round((w * resizePct) / 100);
        h = Math.round((h * resizePct) / 100);
      }

      const swap = rotate === 90 || rotate === 270;
      const outW = swap ? h : w;
      const outH = swap ? w : h;

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no ctx");

      if (target === "image/jpeg") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, outW, outH);
      }

      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);

      const q = target === "image/png" ? undefined : quality / 100;
      const blob = await canvasToBlob(canvas, target, q);
      const outUrl = URL.createObjectURL(blob);
      if (item.outUrl) URL.revokeObjectURL(item.outUrl);
      return {
        ...item,
        outUrl,
        outSize: blob.size,
        outW,
        outH,
        ext: extOf(target),
        processing: false,
      };
    },
    [target, quality, resizeMode, resizeW, resizePct, rotate, flipH, flipV, bgColor],
  );

  const processAll = useCallback(async () => {
    if (items.length === 0) return;
    setItems((p) => p.map((i) => ({ ...i, processing: true })));
    const results: Item[] = [];
    for (const it of items) {
      try {
        results.push(await processOne(it));
      } catch {
        results.push({ ...it, processing: false });
      }
    }
    setItems(results);
  }, [items, processOne]);

  const processSelected = useCallback(async () => {
    if (!selected) return;
    setItems((p) => p.map((i) => (i.id === selected.id ? { ...i, processing: true } : i)));
    try {
      const r = await processOne(selected);
      setItems((p) => p.map((i) => (i.id === selected.id ? r : i)));
    } catch {
      setItems((p) => p.map((i) => (i.id === selected.id ? { ...i, processing: false } : i)));
    }
  }, [selected, processOne]);

  useEffect(() => {
    if (!selected) return;
    const h = setTimeout(() => {
      processSelected();
    }, 200);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, quality, resizeMode, resizeW, resizePct, rotate, flipH, flipV, bgColor, selectedId]);

  const removeItem = (id: string) => {
    setItems((p) => {
      const target = p.find((i) => i.id === id);
      if (target?.srcUrl) URL.revokeObjectURL(target.srcUrl);
      if (target?.outUrl) URL.revokeObjectURL(target.outUrl);
      const next = p.filter((i) => i.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id || null);
      return next;
    });
  };

  const reset = () => {
    items.forEach((i) => {
      if (i.srcUrl) URL.revokeObjectURL(i.srcUrl);
      if (i.outUrl) URL.revokeObjectURL(i.outUrl);
    });
    setItems([]);
    setSelectedId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadItem = (it: Item) => {
    if (!it.outUrl || !it.ext) return;
    const a = document.createElement("a");
    a.href = it.outUrl;
    const base = it.file.name.replace(/\.[^.]+$/, "");
    a.download = `${base}.${it.ext}`;
    a.click();
  };

  const downloadAll = () => {
    items.forEach((it, idx) => setTimeout(() => downloadItem(it), idx * 120));
  };

  const totalOrig = items.reduce((s, i) => s + i.file.size, 0);
  const totalOut = items.reduce((s, i) => s + (i.outSize || 0), 0);
  const anyDone = items.some((i) => i.outUrl);

  return (
    <>
      {items.length === 0 && (
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
            addFiles(e.dataTransfer.files);
          }}
        >
          <div className="drop-icon">
            <IconPaperclip size={36} stroke={1.5} />
          </div>
          <span>
            {t("img_drop_multi")} <u>{t("act_choose_file")}</u>
          </span>
          <br />
          <small style={{ color: "var(--dim)", marginTop: 8, display: "block" }}>
            PNG · JPG · WebP · GIF · BMP · AVIF
          </small>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>
      )}

      {items.length > 0 && (
        <div className="imgx">
          <div className="imgx-top">
            <div className="imgx-preview">
              {selected && (
                <div
                  className="imgx-compare"
                  style={{
                    aspectRatio: `${selected.srcW} / ${selected.srcH}`,
                    maxWidth: `calc(60vh * ${selected.srcW / selected.srcH})`,
                  }}
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setCompareX(((e.clientX - r.left) / r.width) * 100);
                  }}
                  onTouchMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setCompareX(((e.touches[0].clientX - r.left) / r.width) * 100);
                  }}
                >
                  <img src={selected.srcUrl} alt="original" className="imgx-img" />
                  {selected.outUrl && (
                    <img
                      src={selected.outUrl}
                      alt="converted"
                      className="imgx-img imgx-img-top"
                      style={{ clipPath: `inset(0 0 0 ${compareX}%)` }}
                    />
                  )}
                  {selected.outUrl && (
                    <div className="imgx-divider" style={{ left: `${compareX}%` }}>
                      <span className="imgx-handle">
                        <IconArrowsMaximize size={14} stroke={2} />
                      </span>
                    </div>
                  )}
                  <div className="imgx-badge imgx-badge-l">{t("img_original")}</div>
                  {selected.outUrl && (
                    <div className="imgx-badge imgx-badge-r">{t("img_converted")}</div>
                  )}
                  {selected.processing && <div className="imgx-loading">…</div>}
                </div>
              )}

              {selected && (
                <div className="imgx-stats">
                  <div className="imgx-stat">
                    <div className="imgx-stat-label">
                      <IconPhoto size={12} stroke={1.8} /> {t("img_resize")}
                    </div>
                    <div className="imgx-stat-val">
                      <span>{selected.srcW}×{selected.srcH}</span>
                      {selected.outW && (
                        <>
                          <span className="imgx-stat-arrow">→</span>
                          <span className="imgx-stat-strong">{selected.outW}×{selected.outH}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="imgx-stat">
                    <div className="imgx-stat-label">Size</div>
                    <div className="imgx-stat-val">
                      <span>{fmtSize(selected.file.size)}</span>
                      {selected.outSize !== undefined && (
                        <>
                          <span className="imgx-stat-arrow">→</span>
                          <span className="imgx-stat-strong">{fmtSize(selected.outSize)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {selected.outSize !== undefined && (
                    <div
                      className={`imgx-stat imgx-stat-delta ${selected.outSize < selected.file.size ? "good" : "bad"}`}
                    >
                      <div className="imgx-stat-label">Δ</div>
                      <div className="imgx-stat-val">
                        {selected.outSize < selected.file.size
                          ? `−${Math.round((1 - selected.outSize / selected.file.size) * 100)}%`
                          : `+${Math.round((selected.outSize / selected.file.size - 1) * 100)}%`}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="imgx-panel">
              <div className="imgx-group">
                <label className="imgx-label">{t("img_convert_to")}</label>
                <div className="row">
                  {(["image/png", "image/jpeg", "image/webp"] as Fmt[]).map((f) => (
                    <button
                      key={f}
                      className={`fmt-btn${target === f ? " active" : ""}`}
                      onClick={() => setTarget(f)}
                    >
                      {f === "image/png" ? "PNG" : f === "image/jpeg" ? "JPG" : "WebP"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="imgx-group">
                <label className="imgx-label">
                  {t("img_quality")}
                  {target === "image/png" && (
                    <span className="imgx-hint"> {t("img_quality_only")}</span>
                  )}
                </label>
                <Slider
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  showValue
                  formatValue={(v) => `${v}%`}
                  disabled={target === "image/png"}
                />
              </div>

              <div className="imgx-group">
                <label className="imgx-label">{t("img_resize")}</label>
                <Select
                  selectSize="sm"
                  value={resizeMode}
                  onChange={(e) => setResizeMode(e.target.value as ResizeMode)}
                  options={[
                    { value: "none", label: t("img_resize_none") },
                    { value: "width", label: t("img_resize_width") },
                    { value: "percent", label: t("img_resize_percent") },
                  ]}
                />
                {resizeMode === "width" && (
                  <div style={{ marginTop: 8 }}>
                    <Input
                      inputSize="sm"
                      type="number"
                      min={16}
                      max={8192}
                      value={resizeW}
                      onChange={(e) => setResizeW(Number(e.target.value) || 0)}
                      rightSlot={<span>px</span>}
                    />
                  </div>
                )}
                {resizeMode === "percent" && (
                  <div style={{ marginTop: 8 }}>
                    <Slider
                      min={5}
                      max={100}
                      value={resizePct}
                      onChange={(e) => setResizePct(Number(e.target.value))}
                      showValue
                      formatValue={(v) => `${v}%`}
                    />
                  </div>
                )}
              </div>

              <div className="imgx-group">
                <label className="imgx-label">{t("img_rotate")}</label>
                <div className="row">
                  {[0, 90, 180, 270].map((r) => (
                    <button
                      key={r}
                      className={`fmt-btn${rotate === r ? " active" : ""}`}
                      onClick={() => setRotate(r as 0 | 90 | 180 | 270)}
                    >
                      {r === 0 ? "0°" : `${r}°`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="imgx-group">
                <label className="imgx-label">{t("img_flip")}</label>
                <div className="row">
                  <button
                    className={`fmt-btn${flipH ? " active" : ""}`}
                    onClick={() => setFlipH((v) => !v)}
                  >
                    <IconFlipHorizontal size={14} stroke={1.8} /> {t("img_flip_h")}
                  </button>
                  <button
                    className={`fmt-btn${flipV ? " active" : ""}`}
                    onClick={() => setFlipV((v) => !v)}
                  >
                    <IconFlipVertical size={14} stroke={1.8} /> {t("img_flip_v")}
                  </button>
                </div>
              </div>

              {target === "image/jpeg" && (
                <div className="imgx-group">
                  <label className="imgx-label">{t("img_bg")}</label>
                  <div className="row" style={{ gap: 8 }}>
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
                </div>
              )}
            </div>
          </div>

          <div className="imgx-queue">
            <div className="imgx-queue-head">
              <span className="imgx-label">
                {t("img_queue")} ({items.length})
              </span>
              <div className="imgx-actions-bar">
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  leftIcon={<IconPlus size={14} stroke={2} />}
                >
                  {t("img_add_more")}
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={processAll}
                  leftIcon={<IconRotateClockwise size={14} stroke={2} />}
                >
                  {t("img_process_all")}
                </Button>
                <Button
                  size="sm"
                  onClick={downloadAll}
                  disabled={!anyDone}
                  leftIcon={<IconDownload size={14} stroke={2} />}
                >
                  {t("img_download_all")}
                </Button>
                <Button variant="subtle" size="sm" onClick={reset}>
                  {t("act_reset_img")}
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            <div className="imgx-list">
              {items.map((it) => (
                <div
                  key={it.id}
                  className={`imgx-item${selected?.id === it.id ? " active" : ""}`}
                  onClick={() => setSelectedId(it.id)}
                >
                  <div className="imgx-thumb">
                    <img src={it.srcUrl} alt="" />
                  </div>
                  <div className="imgx-meta">
                    <div className="imgx-name" title={it.file.name}>
                      {it.file.name}
                    </div>
                    <div className="imgx-sub">
                      {it.srcW}×{it.srcH} · {fmtSize(it.file.size)}
                      {it.outSize !== undefined && ` → ${fmtSize(it.outSize)}`}
                    </div>
                  </div>
                  <div className="imgx-actions" onClick={(e) => e.stopPropagation()}>
                    {it.outUrl && (
                      <button
                        className="imgx-icon-btn"
                        onClick={() => downloadItem(it)}
                        title={t("img_save")}
                      >
                        <IconDownload size={15} stroke={1.8} />
                      </button>
                    )}
                    <button
                      className="imgx-icon-btn danger"
                      onClick={() => removeItem(it.id)}
                      title={t("img_remove")}
                    >
                      <IconX size={15} stroke={1.8} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 1 && (
              <div className="imgx-total">
                <span className="info-i">
                  {fmtSize(totalOrig)}
                  {totalOut > 0 && ` → ${fmtSize(totalOut)}`}
                </span>
                {totalOut > 0 && (
                  <span
                    className={`info-i imgx-delta ${totalOut < totalOrig ? "good" : "bad"}`}
                  >
                    {totalOut < totalOrig
                      ? `-${Math.round((1 - totalOut / totalOrig) * 100)}%`
                      : `+${Math.round((totalOut / totalOrig - 1) * 100)}%`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
