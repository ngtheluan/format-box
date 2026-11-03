"use client";
import { useToast } from "@/components/Toast";
import { Alert, Badge, Button, IconButton, Input, Progress, Select, Tooltip } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowDown,
  IconArrowUp,
  IconDownload,
  IconFileSpreadsheet,
  IconFileUpload,
  IconLayersIntersect,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ParsedFile = {
  id: string;
  file: File;
  name: string;
  size: number;
};

type MergeMode = "append" | "sheets";
type HeaderMode = "first" | "all" | "none";

type Progress =
  | { stage: "idle" }
  | { stage: "read"; index: number; total: number; name: string }
  | { stage: "write" }
  | { stage: "download" };

const ACCEPT = ".xlsx,.xls,.csv,.ods,.tsv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function FormatFileTool() {
  const { t } = useI18n();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [mergeMode, setMergeMode] = useState<MergeMode>("append");
  const [headerMode, setHeaderMode] = useState<HeaderMode>("first");
  const [outputName, setOutputName] = useState("merged.xlsx");
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState<Progress>({ stage: "idle" });
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const size = files.reduce((s, f) => s + f.size, 0);
    return { size, files: files.length };
  }, [files]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const arr = Array.from(list).filter((f) =>
        /\.(xlsx|xls|csv|ods|tsv)$/i.test(f.name),
      );
      if (arr.length === 0) {
        toast(t("ff_err_unsupported"));
        return;
      }
      const parsed: ParsedFile[] = arr.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
      }));
      setFiles((prev) => [...prev, ...parsed]);
    },
    [t, toast],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const moveFile = useCallback((id: string, dir: -1 | 1) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const merge = useCallback(() => {
    if (files.length === 0 || merging) return;
    setError(null);
    setMerging(true);
    setProgress({ stage: "read", index: 0, total: files.length, name: "" });

    workerRef.current?.terminate();
    const worker = new Worker(new URL("./merge.worker.ts", import.meta.url));
    workerRef.current = worker;

    const finalName = /\.(xlsx|xls|csv)$/i.test(outputName)
      ? outputName
      : `${outputName || "merged"}.xlsx`;
    const lower = finalName.toLowerCase();
    const bookType: "xlsx" | "csv" | "biff8" = lower.endsWith(".csv")
      ? "csv"
      : lower.endsWith(".xls")
        ? "biff8"
        : "xlsx";
    const mimeType =
      bookType === "csv"
        ? "text/csv;charset=utf-8"
        : bookType === "biff8"
          ? "application/vnd.ms-excel"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    worker.addEventListener("message", (e: MessageEvent) => {
      const msg = e.data as
        | { type: "progress"; stage: "read" | "write"; index?: number; total?: number; name?: string }
        | { type: "done"; buffer: ArrayBuffer; rows: number; sheets: number }
        | { type: "error"; message: string };
      if (msg.type === "progress") {
        if (msg.stage === "read") {
          setProgress({
            stage: "read",
            index: msg.index ?? 0,
            total: msg.total ?? files.length,
            name: msg.name ?? "",
          });
        } else if (msg.stage === "write") {
          setProgress({ stage: "write" });
        }
      } else if (msg.type === "done") {
        setProgress({ stage: "download" });
        try {
          const blob = new Blob([msg.buffer], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = finalName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1500);
          toast(t("ff_merged_ok"));
        } catch (dlErr) {
          const m = dlErr instanceof Error ? dlErr.message : String(dlErr);
          setError(`Download failed: ${m}`);
          toast(t("ff_err_merge"));
        }
        setMerging(false);
        setProgress({ stage: "idle" });
        worker.terminate();
        workerRef.current = null;
      } else if (msg.type === "error") {
        console.error("[format-file] worker error:", msg.message);
        setError(msg.message);
        toast(t("ff_err_merge"));
        setMerging(false);
        setProgress({ stage: "idle" });
        worker.terminate();
        workerRef.current = null;
      }
    });

    worker.addEventListener("error", (e) => {
      console.error("[format-file] worker crash:", e);
      setError(e.message || "Worker crashed");
      toast(t("ff_err_merge"));
      setMerging(false);
      setProgress({ stage: "idle" });
      worker.terminate();
      workerRef.current = null;
    });

    worker.postMessage({
      type: "merge",
      files: files.map((f) => f.file),
      mergeMode,
      headerMode,
      bookType,
    });
  }, [files, mergeMode, headerMode, outputName, merging, t, toast]);

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      e.target.value = "";
    },
    [addFiles],
  );

  const progressPct =
    progress.stage === "read" && progress.total > 0
      ? Math.round((progress.index / progress.total) * 100)
      : progress.stage === "write" || progress.stage === "download"
        ? 100
        : 0;

  const progressLabel = (() => {
    if (progress.stage === "read") {
      return `${t("ff_prog_reading")} ${progress.index}/${progress.total} · ${progress.name}`;
    }
    if (progress.stage === "write") return t("ff_prog_writing");
    if (progress.stage === "download") return t("ff_prog_downloading");
    return "";
  })();

  return (
    <div className="ff-wrap">
      <div className="ff-hero">
        <div className="ff-badge">
          <IconFileSpreadsheet size={14} />
          <span>Excel · CSV · ODS</span>
        </div>
        <h1>{t("ff_title")}</h1>
        <p>{t("ff_subtitle")}</p>
      </div>

      <div className="ff-grid" data-has-files={files.length > 0 ? "true" : "false"}>
      <div
        className={`ff-dropzone ${dragOver ? "is-over" : ""} ${files.length > 0 ? "compact" : ""}`}
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
        <div className="ff-drop-icon">
          <IconFileUpload size={32} stroke={1.5} />
        </div>
        <div className="ff-drop-title">{t("ff_drop_title")}</div>
        <div className="ff-drop-sub">.xlsx · .xls · .csv · .ods · .tsv</div>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={onPick}
        />
      </div>

      {files.length > 0 && (
          <div className="ff-list">
            <div className="ff-list-head">
              <div className="ff-list-title">
                <IconLayersIntersect size={16} />
                <span>{t("ff_files_title")}</span>
                <Badge>{files.length}</Badge>
                <span className="ff-list-sub">· {formatBytes(totals.size)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                leftIcon={<IconTrash size={14} />}
                disabled={merging}
              >
                {t("ff_clear")}
              </Button>
            </div>

            <div className="ff-rows">
              {files.map((f, i) => (
                <div key={f.id} className="ff-row">
                  <div className="ff-row-idx">{i + 1}</div>
                  <div className="ff-row-main">
                    <IconFileSpreadsheet size={18} className="ff-row-icon" />
                    <div className="ff-row-info">
                      <div className="ff-row-name" title={f.name}>{f.name}</div>
                      <div className="ff-row-meta">
                        <span>{formatBytes(f.size)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ff-row-actions">
                    <Tooltip content={t("ff_move_up")}>
                      <IconButton
                        aria-label={t("ff_move_up")}
                        size="sm"
                        variant="ghost"
                        disabled={i === 0 || merging}
                        onClick={() => moveFile(f.id, -1)}
                      >
                        <IconArrowUp size={14} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content={t("ff_move_down")}>
                      <IconButton
                        aria-label={t("ff_move_down")}
                        size="sm"
                        variant="ghost"
                        disabled={i === files.length - 1 || merging}
                        onClick={() => moveFile(f.id, 1)}
                      >
                        <IconArrowDown size={14} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content={t("ff_remove")}>
                      <IconButton
                        aria-label={t("ff_remove")}
                        size="sm"
                        variant="ghost"
                        disabled={merging}
                        onClick={() => removeFile(f.id)}
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

      {files.length > 0 && (
        <>
          <div className="ff-options">
            <div className="ff-opt">
              <label className="ff-opt-label">{t("ff_mode")}</label>
              <Select
                value={mergeMode}
                onChange={(e) => setMergeMode(e.target.value as MergeMode)}
                disabled={merging}
                options={[
                  { value: "append", label: t("ff_mode_append") },
                  { value: "sheets", label: t("ff_mode_sheets") },
                ]}
              />
            </div>

            {mergeMode === "append" && (
              <div className="ff-opt">
                <label className="ff-opt-label">{t("ff_header")}</label>
                <Select
                  value={headerMode}
                  onChange={(e) => setHeaderMode(e.target.value as HeaderMode)}
                  disabled={merging}
                  options={[
                    { value: "first", label: t("ff_header_first") },
                    { value: "all", label: t("ff_header_all") },
                    { value: "none", label: t("ff_header_none") },
                  ]}
                />
              </div>
            )}

            <div className="ff-opt ff-opt-name">
              <label className="ff-opt-label">{t("ff_output_name")}</label>
              <Input
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                placeholder="merged.xlsx"
                disabled={merging}
              />
            </div>
            <div className="ff-hint">{t("ff_hint_large")}</div>
          </div>

          {merging && (
            <div className="ff-progress">
              <Progress value={progressPct} />
              <div className="ff-progress-label">{progressLabel}</div>
            </div>
          )}

          {error && (
            <Alert tone="danger" onClose={() => setError(null)}>
              <code style={{ fontSize: 12, wordBreak: "break-word" }}>{error}</code>
            </Alert>
          )}

          <div className="ff-summary">
            <div className="ff-sum-item">
              <IconFileSpreadsheet size={16} />
              <span>
                <b>{totals.files}</b> {t("ff_files")}
              </span>
            </div>
            <div className="ff-sum-sep" />
            <div className="ff-sum-item">
              <span>
                <b>{formatBytes(totals.size)}</b>
              </span>
            </div>
            <div className="ff-sum-cta">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                leftIcon={<IconRefresh size={14} />}
                disabled={merging}
              >
                {t("ff_reset")}
              </Button>
              <Button
                variant="primary"
                onClick={merge}
                disabled={merging || files.length === 0}
                loading={merging}
                leftIcon={<IconDownload size={16} />}
              >
                {merging ? t("ff_merging") : t("ff_merge_download")}
              </Button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .ff-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 12px 0 24px;
        }
        .ff-hero {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 4px 0 2px;
        }
        .ff-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--accent) 14%, transparent),
            color-mix(in srgb, var(--accent2) 14%, transparent));
          border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text);
          letter-spacing: 0.02em;
        }
        .ff-hero h1 {
          margin: 0;
          font-size: 26px;
          line-height: 1.15;
          font-weight: 700;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .ff-hero p {
          margin: 0;
          color: var(--dim);
          font-size: 13.5px;
          max-width: 560px;
        }

        .ff-grid {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) minmax(0, 1.4fr);
          gap: 12px;
        }
        .ff-grid[data-has-files="false"] {
          grid-template-columns: 1fr;
        }
        @media (max-width: 820px) {
          .ff-grid { grid-template-columns: 1fr; }
        }

        .ff-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 28px 16px;
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
        .ff-dropzone:hover,
        .ff-dropzone.is-over {
          border-color: var(--border-h);
          background:
            radial-gradient(120% 100% at 50% 0%,
              color-mix(in srgb, var(--accent) 14%, transparent) 0%,
              transparent 60%),
            var(--bg2);
        }
        .ff-dropzone.is-over { transform: translateY(-1px); }
        .ff-dropzone.compact { padding: 18px 14px; }

        .ff-drop-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
        }
        .ff-drop-title { font-weight: 600; font-size: 14px; color: var(--bright, var(--text)); }
        .ff-drop-sub {
          font-size: 11.5px;
          color: var(--dim);
          font-family: var(--mono);
          letter-spacing: 0.02em;
        }

        .ff-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
        }
        .ff-list-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }
        .ff-list-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 13.5px;
          color: var(--bright, var(--text));
        }
        .ff-list-title :global(svg) { color: var(--accent); }
        .ff-list-sub { font-size: 12px; color: var(--dim); font-weight: 400; }

        .ff-rows {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 360px;
          overflow-y: auto;
          padding-right: 2px;
        }
        .ff-rows::-webkit-scrollbar { width: 6px; }
        .ff-rows::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        .ff-row {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg);
          transition: border-color .15s ease, background .15s ease;
        }
        .ff-row:hover {
          border-color: var(--border-h);
          background: var(--bg3);
        }
        .ff-row-idx {
          width: 22px; height: 22px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600;
          color: var(--dim);
          background: var(--bg3);
          border-radius: 6px;
          flex-shrink: 0;
          font-family: var(--mono);
        }
        .ff-row-main { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .ff-row-icon { color: var(--accent); flex-shrink: 0; }
        .ff-row-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .ff-row-name {
          font-size: 13px; font-weight: 500; color: var(--bright, var(--text));
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ff-row-meta { display: flex; gap: 6px; font-size: 11.5px; color: var(--dim); flex-wrap: wrap; font-family: var(--mono); }
        .ff-row-actions { display: inline-flex; gap: 2px; }

        .ff-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
        }
        .ff-opt { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .ff-opt-name { grid-column: 1 / -1; }
        .ff-opt-label {
          font-size: 11px;
          color: var(--dim);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .ff-hint {
          grid-column: 1 / -1;
          font-size: 12px;
          color: var(--dim);
          line-height: 1.5;
          padding: 8px 10px;
          background: var(--bg);
          border: 1px dashed var(--border);
          border-radius: 8px;
        }

        .ff-progress {
          display: flex; flex-direction: column; gap: 8px;
          padding: 12px;
          border: 1px solid var(--border-h);
          border-radius: 12px;
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--accent) 6%, var(--bg2)),
            var(--bg2));
        }
        .ff-progress-label {
          font-size: 12px;
          color: var(--text);
          font-family: var(--mono);
        }

        .ff-summary {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--accent) 5%, var(--bg2)),
            color-mix(in srgb, var(--accent2) 5%, var(--bg2)));
          flex-wrap: wrap;
        }
        .ff-sum-item { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--dim); }
        .ff-sum-item :global(svg) { color: var(--accent); }
        .ff-sum-item b { color: var(--bright, var(--text)); font-weight: 700; font-size: 14px; }
        .ff-sum-sep {
          width: 1px; height: 18px; background: var(--border);
        }
        .ff-sum-cta { margin-left: auto; display: inline-flex; gap: 8px; }
        @media (max-width: 640px) {
          .ff-summary { flex-direction: column; align-items: stretch; }
          .ff-sum-cta { margin-left: 0; justify-content: flex-end; }
          .ff-sum-sep { display: none; }
        }
      `}</style>
    </div>
  );
}
