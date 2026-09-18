"use client";
import { IconCopy, IconDownload, IconTrash } from "@tabler/icons-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type Ecc = "L" | "M" | "Q" | "H";

export default function QrTool() {
  const toast = useToast();
  const { t } = useI18n();

  const [text, setText] = useState("https://formatbox.dev");
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(2);
  const [ecc, setEcc] = useState<Ecc>("M");
  const [fg, setFg] = useState("#0a0e15");
  const [bg, setBg] = useState("#ffffff");

  const [pngUrl, setPngUrl] = useState("");
  const [svg, setSvg] = useState("");

  const value = text.trim();

  const opts = useMemo(
    () => ({
      errorCorrectionLevel: ecc,
      margin,
      color: { dark: fg, light: bg },
      width: size,
    }),
    [ecc, margin, fg, bg, size],
  );

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setPngUrl("");
      setSvg("");
      return;
    }
    QRCode.toDataURL(value, opts)
      .then((url) => {
        if (!cancelled) setPngUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPngUrl("");
      });
    QRCode.toString(value, { ...opts, type: "svg" })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch(() => {
        if (!cancelled) setSvg("");
      });
    return () => {
      cancelled = true;
    };
  }, [value, opts]);

  const downloadPng = () => {
    if (!pngUrl) return;
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = "qrcode.png";
    a.click();
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyImage = async () => {
    if (!pngUrl) return;
    try {
      const blob = await (await fetch(pngUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast(t("qr_toast_copied"));
    } catch {
      // clipboard image unsupported — fall back to copying the content text
      navigator.clipboard.writeText(value).then(() => toast(t("toast_copied")));
    }
  };

  const eccOptions = [
    { value: "L", label: t("qr_ecc_l") },
    { value: "M", label: t("qr_ecc_m") },
    { value: "Q", label: t("qr_ecc_q") },
    { value: "H", label: t("qr_ecc_h") },
  ];

  return (
    <div className="qr-tool">
      {/* Left: controls */}
      <div className="qr-controls">
        <label className="qr-field">
          <span className="qr-label">{t("qr_input_label")}</span>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("qr_input_placeholder")}
            spellCheck={false}
            rows={3}
          />
        </label>

        <div className="qr-grid">
          <label className="qr-field">
            <span className="qr-label">
              {t("qr_size")}: {size}px
            </span>
            <input
              type="range"
              min={128}
              max={1024}
              step={16}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="qr-range"
            />
          </label>
          <label className="qr-field">
            <span className="qr-label">
              {t("qr_margin")}: {margin}
            </span>
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="qr-range"
            />
          </label>
          <label className="qr-field">
            <span className="qr-label">{t("qr_ecc")}</span>
            <Select
              options={eccOptions}
              value={ecc}
              onChange={(e) => setEcc(e.target.value as Ecc)}
              selectSize="sm"
            />
          </label>
          <div className="qr-colors">
            <label className="qr-field">
              <span className="qr-label">{t("qr_fg")}</span>
              <Input type="color" value={fg} onChange={(e) => setFg(e.target.value)} inputSize="sm" />
            </label>
            <label className="qr-field">
              <span className="qr-label">{t("qr_bg")}</span>
              <Input type="color" value={bg} onChange={(e) => setBg(e.target.value)} inputSize="sm" />
            </label>
          </div>
        </div>

        <div className="qr-actions">
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setText("")}
            leftIcon={<IconTrash size={14} stroke={1.9} />}
          >
            {t("act_clear")}
          </Button>
          <Button
            size="sm"
            onClick={downloadPng}
            disabled={!pngUrl}
            leftIcon={<IconDownload size={14} stroke={1.9} />}
          >
            {t("act_download_img")}
          </Button>
          <Button
            size="sm"
            variant="subtle"
            onClick={downloadSvg}
            disabled={!svg}
            leftIcon={<IconDownload size={14} stroke={1.9} />}
          >
            {t("qr_download_svg")}
          </Button>
          <Button
            size="sm"
            variant="subtle"
            onClick={copyImage}
            disabled={!pngUrl}
            leftIcon={<IconCopy size={14} stroke={1.9} />}
          >
            {t("qr_copy_img")}
          </Button>
        </div>
      </div>

      {/* Right: preview */}
      <div className="qr-preview">
        {pngUrl ? (
          <img src={pngUrl} alt="QR code" className="qr-img" />
        ) : (
          <div className="qr-empty">{t("qr_empty")}</div>
        )}
      </div>

      <style jsx>{`
        .qr-tool {
          display: grid;
          grid-template-columns: 1fr minmax(220px, 320px);
          gap: 18px;
          align-items: start;
        }
        .qr-controls {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
        }
        .qr-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .qr-label {
          font-size: 12px;
          font-weight: 600;
          opacity: 0.75;
        }
        .qr-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .qr-colors {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .qr-range {
          width: 100%;
          accent-color: var(--accent);
        }
        .qr-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .qr-preview {
          position: sticky;
          top: 12px;
          display: grid;
          place-items: center;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--bg2);
          min-height: 240px;
        }
        .qr-img {
          width: 100%;
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          image-rendering: pixelated;
        }
        .qr-empty {
          font-size: 13px;
          opacity: 0.6;
          text-align: center;
          padding: 24px;
        }
        @media (max-width: 720px) {
          .qr-tool {
            grid-template-columns: 1fr;
          }
          .qr-preview {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
