"use client";
import { useRef, useState } from "react";
import { IconPaperclip, IconDownload } from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";

type Fmt = "image/png" | "image/jpeg" | "image/webp";

function fmtSize(b: number) {
  return b > 1048576 ? (b / 1048576).toFixed(2) + " MB" : (b / 1024).toFixed(1) + " KB";
}

export default function ImageTool() {
  const toast = useToast();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const [orig, setOrig] = useState<{ file: File; dataUrl: string } | null>(null);
  const [target, setTarget] = useState<Fmt>("image/png");
  const [quality, setQuality] = useState(85);
  const [converted, setConverted] = useState<{ dataUrl: string; ext: string; size: number; w: number; h: number } | null>(null);

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast(t("toast_only_images"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOrig({ file, dataUrl: String(reader.result) });
      setConverted(null);
    };
    reader.readAsDataURL(file);
  };

  const convert = () => {
    if (!orig) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (target === "image/jpeg") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      const q = target === "image/png" ? undefined : quality / 100;
      const dataUrl = canvas.toDataURL(target, q);
      const extRaw = target.split("/")[1];
      const ext = extRaw === "jpeg" ? "jpg" : extRaw;
      const size = Math.round((dataUrl.length * 3) / 4);
      setConverted({ dataUrl, ext, size, w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = orig.dataUrl;
  };

  const reset = () => {
    setOrig(null);
    setConverted(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const reduction = converted && orig
    ? ((1 - converted.size / orig.file.size) * 100).toFixed(0)
    : null;

  return (
    <>
      {!orig && (
        <div
          className={`drop${dragging ? " drag" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            loadFile(e.dataTransfer.files[0]);
          }}
        >
          <div className="drop-icon"><IconPaperclip size={36} stroke={1.5} /></div>
          <span>{t("img_drop")} <u>{t("act_choose_file")}</u></span>
          <br />
          <small style={{ color: "var(--dim)", marginTop: 8, display: "block" }}>
            PNG, JPG, WebP, GIF, BMP
          </small>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
        </div>
      )}

      {orig && (
        <div className="controls show">
          <label>{t("img_convert_to")}</label>
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

          <label>
            {t("img_quality")}
            {target !== "image/png" && (
              <span style={{ marginLeft: 8 }}>{t("img_quality_only")}</span>
            )}
          </label>
          <div className="slider-wrap">
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
            <span className="slider-val">{quality}%</span>
          </div>

          <div className="actions">
            <button className="btn btn-p" onClick={convert}>{t("act_convert")}</button>
            <button className="btn btn-s" onClick={reset}>{t("act_reset_img")}</button>
          </div>
        </div>
      )}

      {(orig || converted) && (
        <div className="preview-area">
          <div className="preview-box">
            {orig && <img src={orig.dataUrl} alt="original" />}
            <div className="preview-label">
              {orig
                ? `${orig.file.name} · ${fmtSize(orig.file.size)} · ${orig.file.type.split("/")[1].toUpperCase()}`
                : t("img_original")}
            </div>
          </div>
          <div className="preview-box">
            {converted && <img src={converted.dataUrl} alt="converted" />}
            <div className="preview-label">
              {converted
                ? `converted.${converted.ext} · ${fmtSize(converted.size)} · ${converted.ext.toUpperCase()}`
                : t("img_converted")}
            </div>
          </div>
        </div>
      )}

      {converted && (
        <div className="actions">
          <a className="btn btn-p" href={converted.dataUrl} download={`converted.${converted.ext}`}>
            <IconDownload size={16} stroke={1.8} /> {t("img_save")}
          </a>
        </div>
      )}

      {converted && orig && (
        <div className="info">
          <span className="info-i">{converted.w}×{converted.h}</span>
          <span className="info-i">{fmtSize(orig.file.size)} → {fmtSize(converted.size)}</span>
          <span className="info-i">
            {Number(reduction) > 0
              ? `${reduction}% ${t("img_smaller")}`
              : `${Math.abs(Number(reduction))}% ${t("img_bigger")}`}
          </span>
        </div>
      )}
    </>
  );
}
