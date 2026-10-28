"use client";
import { useToast } from "@/components/Toast";
import { Button, Checkbox, IconButton, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowsUpDown,
  IconBolt,
  IconCopy,
  IconDownload,
  IconFileText,
  IconLink,
  IconPaperclip,
  IconPhoto,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "encode" | "decode" | "auto";
type State = "idle" | "ok" | "err";

const BASE64_RE = /^[A-Za-z0-9+/=]+$/;
const BASE64URL_RE = /^[A-Za-z0-9\-_=]+$/;

function looksLikeBase64(s: string) {
  const stripped = s.trim().replace(/\s+/g, "");
  if (stripped.length < 8) return false;
  if (!(BASE64_RE.test(stripped) || BASE64URL_RE.test(stripped))) return false;
  if (/[-_]/.test(stripped)) return true;
  if (stripped.endsWith("=")) return true;
  return stripped.length % 4 === 0 && /[A-Z]/.test(stripped) && /[a-z]/.test(stripped);
}

function toUrlSafe(b64: string) {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromUrlSafe(b64: string) {
  let s = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  return s;
}

function wrap76(s: string) {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += 76) out.push(s.slice(i, i + 76));
  return out.join("\n");
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function Base64Tool() {
  const toast = useToast();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("auto");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [live, setLive] = useState(true);
  const [dataUrl, setDataUrl] = useState("");
  const [mime, setMime] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveMode: "encode" | "decode" = useMemo(() => {
    if (mode === "auto") return looksLikeBase64(input) ? "decode" : "encode";
    return mode;
  }, [mode, input]);

  const inputLabel = effectiveMode === "encode" ? t("b64_label_enc") : t("b64_label_dec");
  const inputPlaceholder = effectiveMode === "encode" ? t("b64_placeholder_text") : t("b64_placeholder_b64");

  const runConvert = (silent: boolean) => {
    const trimmed = input.trim();
    if (!trimmed) {
      setOutput("");
      setState("idle");
      setError("");
      return;
    }
    try {
      if (effectiveMode === "encode") {
        let b64 = btoa(unescape(encodeURIComponent(input)));
        if (urlSafe) b64 = toUrlSafe(b64);
        if (wrap) b64 = wrap76(b64);
        setOutput(b64);
      } else {
        const normalized = /[-_]/.test(trimmed) || urlSafe ? fromUrlSafe(trimmed) : trimmed.replace(/\s+/g, "");
        const decoded = decodeURIComponent(escape(atob(normalized)));
        setOutput(decoded);
      }
      setState("ok");
      setError("");
    } catch (e) {
      setOutput("");
      setState("err");
      const msg = e instanceof Error ? e.message : "Invalid input";
      setError(msg);
      if (!silent) toast(t("toast_invalid_data"));
    }
  };

  useEffect(() => {
    if (!live) return;
    const id = setTimeout(() => runConvert(true), 120);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, mode, urlSafe, wrap, live]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runConvert(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, mode, urlSafe, wrap]);

  const swap = () => {
    if (!output) return;
    setInput(output);
    setOutput("");
    setState("idle");
    setDataUrl("");
    setMime("");
    if (mode === "encode") setMode("decode");
    else if (mode === "decode") setMode("encode");
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError("");
    setState("idle");
    setDataUrl("");
    setMime("");
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => toast(t("toast_copied")));
  };

  const copyDataUrl = () => {
    if (!dataUrl) return;
    navigator.clipboard.writeText(dataUrl).then(() => toast(t("toast_copied")));
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = effectiveMode === "encode" ? "encoded.txt" : "decoded.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    const shouldEncode = effectiveMode === "encode" || mode === "auto";
    if (shouldEncode) {
      reader.onload = () => {
        const result = String(reader.result);
        const base64 = result.split(",")[1] ?? "";
        let out = base64;
        if (urlSafe) out = toUrlSafe(out);
        if (wrap) out = wrap76(out);
        setMode("encode");
        setInput(`[file: ${file.name}]`);
        setOutput(out);
        setDataUrl(result);
        setMime(file.type || "application/octet-stream");
        setState("ok");
        setError("");
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => setInput(String(reader.result));
      reader.readAsText(file);
    }
  };

  const decodedImageUrl = useMemo(() => {
    if (effectiveMode !== "decode" || state !== "ok" || !output) return "";
    const trimmed = output.trim();
    if (/^data:image\/[a-z+.-]+;base64,/.test(trimmed)) return trimmed;
    return "";
  }, [effectiveMode, state, output]);

  const previewSrc = decodedImageUrl || (dataUrl && mime.startsWith("image/") ? dataUrl : "");

  const stats = useMemo(() => {
    const inBytes = new Blob([input]).size;
    const outBytes = new Blob([output]).size;
    const ratio = effectiveMode === "encode" && inBytes > 0 ? Math.round(((output.length - inBytes) / inBytes) * 100) : 0;
    return { inBytes, outBytes, ratio };
  }, [input, output, effectiveMode]);

  return (
    <>
      <div className="toolbar b64-toolbar">
        <div className="tabs">
          <button className={`tab${mode === "encode" ? " active" : ""}`} onClick={() => setMode("encode")}>
            {t("b64_mode_encode")}
          </button>
          <button className={`tab${mode === "decode" ? " active" : ""}`} onClick={() => setMode("decode")}>
            {t("b64_mode_decode")}
          </button>
          <button
            className={`tab${mode === "auto" ? " active" : ""}`}
            onClick={() => setMode("auto")}
            title={t("b64_mode_auto_tip")}
          >
            {t("b64_mode_auto")}
          </button>
        </div>
        <div className="b64-options">
          <Checkbox
            checked={urlSafe}
            onChange={(e) => setUrlSafe(e.currentTarget.checked)}
            label={
              <span className="b64-opt-label" title={t("b64_url_safe_tip")}>
                <IconLink size={13} stroke={1.8} /> {t("b64_url_safe")}
              </span>
            }
          />
          <Checkbox
            checked={wrap}
            onChange={(e) => setWrap(e.currentTarget.checked)}
            label={
              <span className="b64-opt-label" title={t("b64_wrap_tip")}>
                <IconFileText size={13} stroke={1.8} /> {t("b64_wrap")}
              </span>
            }
          />
          <Checkbox
            checked={live}
            onChange={(e) => setLive(e.currentTarget.checked)}
            label={
              <span className="b64-opt-label" title={t("b64_live_tip")}>
                <IconBolt size={13} stroke={1.8} /> {t("b64_live")}
              </span>
            }
          />
          <div className="b64-icon-group">
            <IconButton aria-label={t("b64_swap")} title={t("b64_swap")} onClick={swap}>
              <IconArrowsUpDown size={18} stroke={1.8} />
            </IconButton>
            <IconButton aria-label={t("act_clear")} title={t("act_clear")} onClick={clear}>
              <IconTrash size={18} stroke={1.8} />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="cols">
        <div className="col">
          <div className="col-head">
            <label>{inputLabel}</label>
            {mode === "auto" && input.trim() && (
              <span className={`b64-mode-badge ${effectiveMode}`}>
                {effectiveMode === "encode" ? t("b64_badge_enc") : t("b64_badge_dec")}
              </span>
            )}
          </div>
          <Textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (dataUrl) {
                setDataUrl("");
                setMime("");
              }
            }}
            placeholder={inputPlaceholder}
          />
          <div className="b64-stats">
            <span>
              {input.length.toLocaleString()} {t("lbl_chars")}
            </span>
            <span>{formatBytes(stats.inBytes)}</span>
            {mime && <span className="b64-mime-pill">{mime}</span>}
          </div>
          <div
            className={`drop-zone${dragging ? " drag" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files[0]);
            }}
          >
            <span className="drop-inline">
              <IconPaperclip size={16} stroke={1.7} /> {t("b64_drop")} <u>{t("act_choose_file")}</u>
            </span>
            <input ref={fileRef} type="file" onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>
        </div>

        <div className="col">
          <div className="col-head">
            <label>{t("lbl_result")}</label>
            {!live && (
              <Button size="sm" variant="subtle" onClick={() => runConvert(false)} leftIcon={<IconPlayerPlay size={14} stroke={1.8} />}>
                {t("b64_run")}
              </Button>
            )}
          </div>
          <Textarea
            className={`output-area${state === "ok" ? " state-ok" : state === "err" ? " state-err" : ""}`}
            readOnly
            value={state === "err" ? error : output}
            placeholder={t("b64_result_hint")}
          />
          <div className="b64-stats">
            <span>
              {output.length.toLocaleString()} {t("lbl_chars")}
            </span>
            <span>{formatBytes(stats.outBytes)}</span>
            {output && effectiveMode === "encode" && stats.inBytes > 0 && (
              <span className="b64-ratio">
                {stats.ratio >= 0 ? "+" : ""}
                {stats.ratio}% {t("b64_ratio")}
              </span>
            )}
          </div>
          <div className="actions">
            <Button
              size="sm"
              variant="subtle"
              onClick={copy}
              leftIcon={<IconCopy size={15} stroke={1.8} />}
              disabled={!output}
            >
              {t("act_copy")}
            </Button>
            <Button
              size="sm"
              variant="subtle"
              onClick={download}
              leftIcon={<IconDownload size={15} stroke={1.8} />}
              disabled={!output}
            >
              {t("act_download")}
            </Button>
            {dataUrl && (
              <Button
                size="sm"
                variant="subtle"
                onClick={copyDataUrl}
                leftIcon={<IconLink size={15} stroke={1.8} />}
                title={t("b64_data_url")}
              >
                Data URL
              </Button>
            )}
          </div>
          {previewSrc && (
            <div className="b64-preview">
              <div className="b64-preview-head">
                <IconPhoto size={14} stroke={1.8} /> {t("b64_preview")}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt="preview" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
