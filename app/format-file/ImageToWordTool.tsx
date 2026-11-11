"use client";
import { useToast } from "@/components/Toast";
import { Alert, Badge, Button, IconButton, Input, Progress, Select, Switch, Textarea, Tooltip } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowUp,
  IconCheck,
  IconDownload,
  IconFileText,
  IconFileUpload,
  IconPhoto,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type OcrStatus = "pending" | "running" | "done" | "skipped" | "error";

type ImgItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  url: string;
  text: string;
  status: OcrStatus;
  percent: number;
};

type PageSize = "A4" | "Letter";
type Orientation = "portrait" | "landscape";
type OcrLang = "vie" | "eng" | "vie+eng";

const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PAGE_DIMS: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 8.27, h: 11.69 },
  Letter: { w: 8.5, h: 11 },
};

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";

type TesseractNS = {
  createWorker: (
    langs: string,
    oem?: number,
    options?: { logger?: (m: { status: string; progress: number }) => void },
  ) => Promise<{
    recognize: (img: string) => Promise<{ data: { text: string } }>;
    terminate: () => Promise<unknown>;
  }>;
};

let tesseractPromise: Promise<TesseractNS> | null = null;

function loadTesseract(): Promise<TesseractNS> {
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    const w = window as unknown as { Tesseract?: TesseractNS };
    if (w.Tesseract) {
      resolve(w.Tesseract);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-tesseract="1"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => {
        const g = (window as unknown as { Tesseract?: TesseractNS }).Tesseract;
        if (g) resolve(g);
        else reject(new Error("Tesseract failed to load"));
      });
      existing.addEventListener("error", () => reject(new Error("Tesseract script error")));
      return;
    }
    const script = document.createElement("script");
    script.src = TESSERACT_CDN;
    script.async = true;
    script.dataset.tesseract = "1";
    script.onload = () => {
      const g = (window as unknown as { Tesseract?: TesseractNS }).Tesseract;
      if (g) resolve(g);
      else reject(new Error("Tesseract loaded but global missing"));
    };
    script.onerror = () => reject(new Error("Cannot load tesseract.js from CDN"));
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

function buildTextWordHtml(opts: {
  title: string;
  items: { name: string; text: string }[];
  pageSize: PageSize;
  orientation: Orientation;
  includeHeadings: boolean;
}): string {
  const { title, items, pageSize, orientation, includeHeadings } = opts;
  const dims = PAGE_DIMS[pageSize];
  const pageW = orientation === "portrait" ? dims.w : dims.h;
  const pageH = orientation === "portrait" ? dims.h : dims.w;
  const margin = 0.8;

  const blocks: string[] = [];
  items.forEach((it, i) => {
    if (i > 0) blocks.push(`<div style="page-break-before:always;"></div>`);
    if (includeHeadings) {
      blocks.push(
        `<h2 style="font-size:14pt;color:#1f2937;margin:0 0 10pt;">${escapeHtml(it.name)}</h2>`,
      );
    }
    const paragraphs = it.text
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const body =
      paragraphs.length > 0
        ? paragraphs
        : it.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const p of body) {
      blocks.push(
        `<p style="margin:0 0 8pt;line-height:1.5;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`,
      );
    }
  });

  const sectionStyle =
    `size:${pageW}in ${pageH}in;` +
    `margin:${margin}in ${margin}in ${margin}in ${margin}in;`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
  </w:WordDocument>
</xml>
<style>
@page { ${sectionStyle} }
body { font-family: Calibri, "Segoe UI", Arial, sans-serif; font-size: 12pt; color:#111827; margin:0; padding:0; }
</style>
</head>
<body>
${blocks.join("\n")}
</body>
</html>`;
}

export default function ImageToWordTool({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<{
    lang: OcrLang;
    worker: { recognize: (img: string) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };
  } | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const currentIdRef = useRef<string | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [images, setImages] = useState<ImgItem[]>([]);
  const [ocrLang, setOcrLang] = useState<OcrLang>("vie+eng");
  const [outputName, setOutputName] = useState("extracted.doc");
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [includeHeadings, setIncludeHeadings] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState<{ active: boolean; status: string; percent: number }>({
    active: false,
    status: "",
    percent: 0,
  });

  const totals = useMemo(() => {
    const size = images.reduce((s, i) => s + i.size, 0);
    const done = images.filter((i) => i.status === "done").length;
    const skipped = images.filter((i) => i.status === "skipped").length;
    const running = images.filter((i) => i.status === "running" || i.status === "pending").length;
    return { size, count: images.length, done, skipped, running };
  }, [images]);

  const anyProcessing = totals.running > 0;
  const hasReady = images.some((i) => i.status === "done" && i.text.trim().length > 0);

  useEffect(() => {
    return () => {
      workerRef.current?.worker.terminate().catch(() => {});
      workerRef.current = null;
    };
  }, []);

  // Reset worker when language changes
  useEffect(() => {
    if (workerRef.current && workerRef.current.lang !== ocrLang) {
      const w = workerRef.current;
      workerRef.current = null;
      w.worker.terminate().catch(() => {});
    }
  }, [ocrLang]);

  const logger = useCallback((m: { status: string; progress: number }) => {
    const pct = Math.max(0, Math.min(100, Math.round((m.progress ?? 0) * 100)));
    if (m.status === "recognizing text") {
      setModelLoading((s) => (s.active ? { active: false, status: "", percent: 0 } : s));
      const id = currentIdRef.current;
      if (!id) return;
      setImages((prev) => prev.map((i) => (i.id === id ? { ...i, percent: pct } : i)));
    } else {
      setModelLoading({ active: true, status: m.status || "", percent: pct });
    }
  }, []);

  const ensureWorker = useCallback(async () => {
    if (workerRef.current && workerRef.current.lang === ocrLang) return workerRef.current.worker;
    setModelLoading({ active: true, status: "starting", percent: 0 });
    const Tesseract = await loadTesseract();
    const worker = await Tesseract.createWorker(ocrLang, 1, { logger });
    setModelLoading({ active: false, status: "", percent: 0 });
    workerRef.current = { lang: ocrLang, worker };
    return workerRef.current.worker;
  }, [ocrLang, logger]);

  const processOne = useCallback(
    async (id: string, imageUrl: string) => {
      try {
        currentIdRef.current = id;
        setImages((prev) => prev.map((i) => (i.id === id ? { ...i, status: "running", percent: 0 } : i)));
        const worker = await ensureWorker();
        const { data } = await worker.recognize(imageUrl);
        const text = (data.text || "").trim();
        setImages((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  text,
                  status: text.length === 0 ? "skipped" : "done",
                  percent: 100,
                }
              : i,
          ),
        );
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        setImages((prev) => prev.map((i) => (i.id === id ? { ...i, status: "error", text: "" } : i)));
        setError(m);
      } finally {
        if (currentIdRef.current === id) currentIdRef.current = null;
      }
    },
    [ensureWorker],
  );

  const enqueue = useCallback(
    (id: string, imageUrl: string) => {
      queueRef.current = queueRef.current.then(() => processOne(id, imageUrl));
    },
    [processOne],
  );

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const arr = Array.from(list).filter((f) => /^image\//.test(f.type));
      if (arr.length === 0) {
        toast(t("ff_img_err_unsupported"));
        return;
      }
      const loaded: ImgItem[] = await Promise.all(
        arr.map(async (file) => {
          const url = await fileToDataUrl(file);
          return {
            id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            name: file.name,
            size: file.size,
            url,
            text: "",
            status: "pending" as OcrStatus,
            percent: 0,
          };
        }),
      );
      setImages((prev) => [...prev, ...loaded]);
      loaded.forEach((it) => enqueue(it.id, it.url));
    },
    [t, toast, enqueue],
  );

  const removeImg = useCallback((id: string) => {
    setImages((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const moveImg = useCallback((id: string, dir: -1 | 1) => {
    setImages((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }, []);

  const updateText = useCallback((id: string, text: string) => {
    setImages((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              text,
              status: text.trim().length === 0 ? "skipped" : "done",
            }
          : i,
      ),
    );
  }, []);

  const retry = useCallback(
    (id: string) => {
      const target = images.find((i) => i.id === id);
      if (!target) return;
      setImages((prev) => prev.map((i) => (i.id === id ? { ...i, status: "pending", text: "", percent: 0 } : i)));
      enqueue(id, target.url);
    },
    [enqueue, images],
  );

  const clearAll = useCallback(() => {
    setImages([]);
    setError(null);
  }, []);

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      e.target.value = "";
    },
    [addFiles],
  );

  const generate = useCallback(() => {
    if (!hasReady || generating) return;
    setError(null);
    setGenerating(true);
    try {
      const finalName = /\.(docx?|html?)$/i.test(outputName)
        ? outputName.replace(/\.(docx|html?)$/i, ".doc")
        : `${outputName || "extracted"}.doc`;
      const title = finalName.replace(/\.[^.]+$/, "");
      const items = images
        .filter((i) => i.status === "done" && i.text.trim().length > 0)
        .map((i) => ({ name: i.name, text: i.text }));
      const html = buildTextWordHtml({
        title,
        items,
        pageSize,
        orientation,
        includeHeadings,
      });
      const blob = new Blob(["﻿", html], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast(t("ff_img_ocr_ok"));
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setError(m);
      toast(t("ff_img_err"));
    } finally {
      setGenerating(false);
    }
  }, [images, hasReady, generating, outputName, pageSize, orientation, includeHeadings, t, toast]);

  const statusTone = (s: OcrStatus): "success" | "warning" | "danger" | "info" | undefined => {
    if (s === "done") return "success";
    if (s === "skipped") return "warning";
    if (s === "error") return "danger";
    return "info";
  };

  const statusLabel = (s: OcrStatus) => {
    if (s === "pending") return t("ff_img_st_pending");
    if (s === "running") return t("ff_img_st_running");
    if (s === "done") return t("ff_img_st_done");
    if (s === "skipped") return t("ff_img_st_skipped");
    return t("ff_img_st_error");
  };

  return (
    <div className="iw-wrap">
      <div className="iw-hero">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            leftIcon={<IconArrowLeft size={14} />}
          >
            {t("ff_back")}
          </Button>
        )}
        <div className="iw-badge">
          <IconFileText size={14} />
          <span>OCR → Word</span>
        </div>
        <h1>{t("ff_img_title")}</h1>
        <p>{t("ff_img_subtitle")}</p>
      </div>

      <div className="iw-grid" data-has-files={images.length > 0 ? "true" : "false"}>
        <div
          className={`iw-dropzone ${dragOver ? "is-over" : ""} ${images.length > 0 ? "compact" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              addFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="iw-drop-icon">
            <IconFileUpload size={32} stroke={1.5} />
          </div>
          <div className="iw-drop-title">{t("ff_img_drop_title")}</div>
          <div className="iw-drop-sub">.jpg · .png · .webp · .gif · .bmp</div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={onPick}
          />
        </div>

        {images.length > 0 && (
          <div className="iw-side">
            <div className="iw-side-head">
              <div className="iw-side-title">
                <IconPhoto size={16} />
                <span>{t("ff_img_files_title")}</span>
                <Badge>{images.length}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                leftIcon={<IconTrash size={14} />}
                disabled={generating}
              >
                {t("ff_clear")}
              </Button>
            </div>

            <div className="iw-side-stats">
              <span className="iw-stat">
                <b>{totals.done}</b> {t("ff_img_st_done")}
              </span>
              <span className="iw-stat">
                <b>{totals.skipped}</b> {t("ff_img_st_skipped")}
              </span>
              {totals.running > 0 && (
                <span className="iw-stat iw-stat-run">
                  <b>{totals.running}</b> {t("ff_img_st_running")}
                </span>
              )}
            </div>

            <div className="iw-rows">
              {images.map((f, i) => (
                <div key={f.id} className={`iw-row iw-row-${f.status}`}>
                  <div className="iw-row-idx">{i + 1}</div>
                  <div className="iw-row-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.name} />
                  </div>
                  <div className="iw-row-info">
                    <div className="iw-row-name" title={f.name}>{f.name}</div>
                    <div className="iw-row-meta">
                      <Badge size="sm" tone={statusTone(f.status)} variant="soft">
                        {f.status === "running" && modelLoading.active && currentIdRef.current === f.id
                          ? t("ff_img_model_loading")
                          : statusLabel(f.status)}
                      </Badge>
                      {f.status === "running" && !modelLoading.active && (
                        <span className="iw-row-pct">{f.percent}%</span>
                      )}
                      {f.status === "done" && (
                        <span className="iw-row-chars">· {f.text.length} {t("ff_img_chars")}</span>
                      )}
                    </div>
                    {f.status === "running" && !modelLoading.active && <Progress value={f.percent} />}
                  </div>
                  <div className="iw-row-actions">
                    {(f.status === "skipped" || f.status === "error") && (
                      <Tooltip content={t("ff_img_retry")}>
                        <IconButton
                          aria-label={t("ff_img_retry")}
                          size="sm"
                          variant="ghost"
                          disabled={generating}
                          onClick={() => retry(f.id)}
                        >
                          <IconRefresh size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip content={t("ff_move_up")}>
                      <IconButton
                        aria-label={t("ff_move_up")}
                        size="sm"
                        variant="ghost"
                        disabled={i === 0 || generating}
                        onClick={() => moveImg(f.id, -1)}
                      >
                        <IconArrowUp size={14} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content={t("ff_move_down")}>
                      <IconButton
                        aria-label={t("ff_move_down")}
                        size="sm"
                        variant="ghost"
                        disabled={i === images.length - 1 || generating}
                        onClick={() => moveImg(f.id, 1)}
                      >
                        <IconArrowDown size={14} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content={t("ff_remove")}>
                      <IconButton
                        aria-label={t("ff_remove")}
                        size="sm"
                        variant="ghost"
                        disabled={generating}
                        onClick={() => removeImg(f.id)}
                      >
                        <IconX size={14} />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <>
          <div className="iw-options">
            <div className="iw-opt">
              <label className="iw-opt-label">{t("ff_img_ocr_lang")}</label>
              <Select
                value={ocrLang}
                onChange={(e) => setOcrLang(e.target.value as OcrLang)}
                disabled={anyProcessing || generating}
                options={[
                  { value: "vie+eng", label: t("ff_img_ocr_lang_vieng") },
                  { value: "vie", label: "Tiếng Việt" },
                  { value: "eng", label: "English" },
                ]}
              />
            </div>
            <div className="iw-opt">
              <label className="iw-opt-label">{t("ff_img_page_size")}</label>
              <Select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageSize)}
                disabled={generating}
                options={[
                  { value: "A4", label: "A4" },
                  { value: "Letter", label: "Letter" },
                ]}
              />
            </div>
            <div className="iw-opt">
              <label className="iw-opt-label">{t("ff_img_orientation")}</label>
              <Select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as Orientation)}
                disabled={generating}
                options={[
                  { value: "portrait", label: t("ff_img_portrait") },
                  { value: "landscape", label: t("ff_img_landscape") },
                ]}
              />
            </div>
            <div className="iw-opt iw-opt-full">
              <Switch
                checked={includeHeadings}
                onChange={(e) => setIncludeHeadings(e.target.checked)}
                disabled={generating}
                label={t("ff_img_ocr_headings")}
              />
            </div>
            <div className="iw-opt iw-opt-name">
              <label className="iw-opt-label">{t("ff_output_name")}</label>
              <Input
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                placeholder="extracted.doc"
                disabled={generating}
              />
            </div>
            <div className="iw-hint">{t("ff_img_ocr_hint")}</div>
          </div>

          {modelLoading.active && (
            <div className="iw-modelload">
              <div className="iw-modelload-row">
                <IconRefresh size={14} className="iw-spin" />
                <span>
                  {t("ff_img_model_loading")} · <code>{modelLoading.status}</code>
                </span>
                <span className="iw-modelload-pct">{modelLoading.percent}%</span>
              </div>
              <Progress value={modelLoading.percent} />
              <div className="iw-modelload-hint">{t("ff_img_model_loading_hint")}</div>
            </div>
          )}

          {images.some((i) => i.status === "done" || i.status === "skipped" || i.status === "running") && (
            <div className="iw-preview">
              <div className="iw-preview-head">
                <IconFileText size={16} />
                <span>{t("ff_img_preview_title")}</span>
                {anyProcessing && (
                  <Badge tone="info" size="sm" variant="soft">
                    {t("ff_img_st_running")}...
                  </Badge>
                )}
              </div>
              <div className="iw-preview-body">
                {images.map((it, i) => (
                  <div key={it.id} className="iw-preview-block">
                    {includeHeadings && (
                      <div className="iw-preview-h">
                        <span className="iw-preview-h-idx">{i + 1}</span>
                        <span className="iw-preview-h-name">{it.name}</span>
                        <Badge size="sm" tone={statusTone(it.status)} variant="soft">
                          {statusLabel(it.status)}
                        </Badge>
                      </div>
                    )}
                    {it.status === "running" || it.status === "pending" ? (
                      <div className="iw-preview-waiting">
                        <Progress
                          value={modelLoading.active && currentIdRef.current === it.id ? modelLoading.percent : it.percent}
                          indeterminate={it.status === "pending"}
                        />
                        <span>
                          {modelLoading.active && currentIdRef.current === it.id
                            ? t("ff_img_model_loading")
                            : t("ff_img_preview_waiting")}
                        </span>
                      </div>
                    ) : it.status === "skipped" ? (
                      <div className="iw-preview-skip">
                        {t("ff_img_preview_skip")}
                      </div>
                    ) : it.status === "error" ? (
                      <div className="iw-preview-err">
                        {t("ff_img_preview_err")}
                      </div>
                    ) : (
                      <Textarea
                        value={it.text}
                        onChange={(e) => updateText(it.id, e.target.value)}
                        rows={Math.min(14, Math.max(4, it.text.split("\n").length + 1))}
                        disabled={generating}
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                          fontSize: 12.5,
                          lineHeight: 1.55,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <Alert tone="danger" onClose={() => setError(null)}>
              <code style={{ fontSize: 12, wordBreak: "break-word" }}>{error}</code>
            </Alert>
          )}

          <div className="iw-summary">
            <div className="iw-sum-item">
              <IconPhoto size={16} />
              <span>
                <b>{totals.count}</b> {t("ff_img_images")}
              </span>
            </div>
            <div className="iw-sum-sep" />
            <div className="iw-sum-item">
              <IconCheck size={16} />
              <span>
                <b>{totals.done}</b> {t("ff_img_st_done")}
              </span>
            </div>
            <div className="iw-sum-sep" />
            <div className="iw-sum-item">
              <span>{formatBytes(totals.size)}</span>
            </div>
            <div className="iw-sum-cta">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                leftIcon={<IconRefresh size={14} />}
                disabled={generating}
              >
                {t("ff_reset")}
              </Button>
              <Button
                variant="primary"
                onClick={generate}
                disabled={generating || anyProcessing || !hasReady}
                loading={generating}
                leftIcon={<IconDownload size={16} />}
              >
                {generating
                  ? t("ff_img_generating")
                  : anyProcessing
                    ? t("ff_img_wait_ocr")
                    : t("ff_img_download")}
              </Button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .iw-wrap { display: flex; flex-direction: column; gap: 14px; padding: 12px 0 24px; }
        .iw-hero {
          text-align: center;
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 4px 0 2px;
          position: relative;
        }
        .iw-hero :global(button) { position: absolute; left: 0; top: 0; }
        .iw-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px;
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--accent) 14%, transparent),
            color-mix(in srgb, var(--accent2) 14%, transparent));
          border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 11px; font-weight: 500; color: var(--text);
          letter-spacing: 0.02em;
        }
        .iw-hero h1 {
          margin: 0; font-size: 26px; line-height: 1.15; font-weight: 700;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .iw-hero p { margin: 0; color: var(--dim); font-size: 13.5px; max-width: 560px; }

        .iw-grid {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) minmax(0, 1.4fr);
          gap: 12px;
        }
        .iw-grid[data-has-files="false"] { grid-template-columns: 1fr; }
        @media (max-width: 820px) { .iw-grid { grid-template-columns: 1fr; } }

        .iw-dropzone {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; padding: 28px 16px;
          border: 1.5px dashed var(--border);
          border-radius: 14px;
          background:
            radial-gradient(120% 100% at 50% 0%,
              color-mix(in srgb, var(--accent) 7%, transparent) 0%,
              transparent 55%),
            var(--bg2);
          cursor: pointer;
          transition: border-color .18s ease, background .18s ease, transform .18s ease;
        }
        .iw-dropzone:hover, .iw-dropzone.is-over {
          border-color: var(--border-h);
          background:
            radial-gradient(120% 100% at 50% 0%,
              color-mix(in srgb, var(--accent) 14%, transparent) 0%,
              transparent 60%),
            var(--bg2);
        }
        .iw-dropzone.is-over { transform: translateY(-1px); }
        .iw-dropzone.compact { padding: 18px 14px; }

        .iw-drop-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 48px; height: 48px;
          border-radius: 14px;
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
        }
        .iw-drop-title { font-weight: 600; font-size: 14px; color: var(--bright, var(--text)); }
        .iw-drop-sub { font-size: 11.5px; color: var(--dim); font-family: var(--mono); letter-spacing: 0.02em; }

        .iw-side {
          display: flex; flex-direction: column; gap: 10px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
        }
        .iw-side-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }
        .iw-side-title {
          display: inline-flex; align-items: center; gap: 8px;
          font-weight: 600; font-size: 13.5px; color: var(--bright, var(--text));
        }
        .iw-side-title :global(svg) { color: var(--accent); }
        .iw-side-stats {
          display: inline-flex; flex-wrap: wrap; gap: 10px;
          font-size: 12px; color: var(--dim);
        }
        .iw-stat b { color: var(--bright, var(--text)); font-weight: 600; }
        .iw-stat-run b { color: var(--accent); }

        .iw-rows {
          display: flex; flex-direction: column; gap: 6px;
          max-height: 420px; overflow-y: auto;
          padding-right: 2px;
        }
        .iw-rows::-webkit-scrollbar { width: 6px; }
        .iw-rows::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        .iw-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 10px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg);
          transition: border-color .15s ease, background .15s ease;
        }
        .iw-row:hover { border-color: var(--border-h); background: var(--bg3); }
        .iw-row-skipped { opacity: .7; }
        .iw-row-error { border-color: color-mix(in srgb, var(--err, #e34) 40%, var(--border)); }

        .iw-row-idx {
          width: 22px; height: 22px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600;
          color: var(--dim); background: var(--bg3);
          border-radius: 6px; flex-shrink: 0;
          font-family: var(--mono);
        }
        .iw-row-thumb {
          width: 40px; height: 40px;
          flex-shrink: 0;
          border-radius: 6px; overflow: hidden;
          background: var(--bg3);
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--border);
        }
        .iw-row-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .iw-row-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
        .iw-row-name {
          font-size: 13px; font-weight: 500; color: var(--bright, var(--text));
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .iw-row-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dim); flex-wrap: wrap; }
        .iw-row-pct { font-family: var(--mono); font-size: 11px; color: var(--accent); }
        .iw-row-chars { font-family: var(--mono); font-size: 11px; }
        .iw-row-actions { display: inline-flex; gap: 2px; }

        .iw-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
        }
        .iw-opt { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .iw-opt-name { grid-column: 1 / -1; }
        .iw-opt-full { grid-column: 1 / -1; }
        .iw-opt-label {
          font-size: 11px; color: var(--dim); font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .iw-hint {
          grid-column: 1 / -1;
          font-size: 12px; color: var(--dim); line-height: 1.5;
          padding: 8px 10px;
          background: var(--bg);
          border: 1px dashed var(--border);
          border-radius: 8px;
        }

        .iw-modelload {
          display: flex; flex-direction: column; gap: 6px;
          padding: 10px 12px;
          border: 1px solid var(--border-h);
          border-radius: 10px;
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--accent) 8%, var(--bg2)),
            var(--bg2));
        }
        .iw-modelload-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 12.5px; color: var(--text);
        }
        .iw-modelload-row :global(svg) { color: var(--accent); }
        .iw-modelload-row code {
          font-family: var(--mono); font-size: 11.5px;
          padding: 2px 6px; background: var(--bg); border: 1px solid var(--border); border-radius: 5px;
          color: var(--dim);
        }
        .iw-modelload-pct {
          margin-left: auto; font-family: var(--mono); font-size: 12px; color: var(--accent); font-weight: 600;
        }
        .iw-modelload-hint { font-size: 11.5px; color: var(--dim); line-height: 1.5; }
        .iw-spin { animation: iw-spin 1.1s linear infinite; }
        @keyframes iw-spin { to { transform: rotate(360deg); } }

        .iw-preview {
          display: flex; flex-direction: column; gap: 12px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
        }
        .iw-preview-head {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13.5px; font-weight: 600; color: var(--bright, var(--text));
        }
        .iw-preview-head :global(svg) { color: var(--accent); }
        .iw-preview-body { display: flex; flex-direction: column; gap: 14px; }
        .iw-preview-block {
          display: flex; flex-direction: column; gap: 6px;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg);
        }
        .iw-preview-h {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 12.5px; color: var(--bright, var(--text));
          font-weight: 600;
        }
        .iw-preview-h-idx {
          width: 20px; height: 20px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 11px; color: var(--dim);
          background: var(--bg3); border-radius: 5px;
          font-family: var(--mono);
        }
        .iw-preview-h-name {
          flex: 1; min-width: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          font-weight: 500; font-size: 12.5px;
        }
        .iw-preview-waiting {
          display: flex; flex-direction: column; gap: 6px;
          padding: 10px; font-size: 12px; color: var(--dim); font-style: italic;
        }
        .iw-preview-skip, .iw-preview-err {
          padding: 10px;
          font-size: 12.5px; font-style: italic;
          color: var(--dim);
          background: color-mix(in srgb, var(--warn, var(--dim)) 8%, transparent);
          border-radius: 6px;
        }
        .iw-preview-err {
          color: var(--err, #e34);
          background: color-mix(in srgb, var(--err, #e34) 8%, transparent);
        }

        .iw-summary {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--accent) 5%, var(--bg2)),
            color-mix(in srgb, var(--accent2) 5%, var(--bg2)));
          flex-wrap: wrap;
        }
        .iw-sum-item { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--dim); }
        .iw-sum-item :global(svg) { color: var(--accent); }
        .iw-sum-item b { color: var(--bright, var(--text)); font-weight: 700; font-size: 14px; }
        .iw-sum-sep { width: 1px; height: 18px; background: var(--border); }
        .iw-sum-cta { margin-left: auto; display: inline-flex; gap: 8px; }
        @media (max-width: 640px) {
          .iw-summary { flex-direction: column; align-items: stretch; }
          .iw-sum-cta { margin-left: 0; justify-content: flex-end; }
          .iw-sum-sep { display: none; }
        }
      `}</style>
    </div>
  );
}
