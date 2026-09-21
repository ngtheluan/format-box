"use client";
import { useCallback, useRef, useState } from "react";
import {
  IconCopy,
  IconRefresh,
  IconTrash,
  IconCheck,
  IconDownload,
} from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { Button, Select } from "@/components/ui";

function uuidV4(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function formatUuid(raw: string, upper: boolean, hyphens: boolean): string {
  const out = hyphens ? raw : raw.replace(/-/g, "");
  return upper ? out.toUpperCase() : out.toLowerCase();
}

const COUNT_OPTIONS = [1, 5, 10, 20, 50].map((n) => ({
  value: String(n),
  label: String(n),
}));

export default function UuidTool() {
  const toast = useToast();
  const { t } = useI18n();
  const [uuids, setUuids] = useState<string[]>(() => [uuidV4()]);
  const [count, setCount] = useState(1);
  const [upper, setUpper] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>();

  const generate = useCallback(() => {
    setUuids(Array.from({ length: count }, () => uuidV4()));
    setCopiedIdx(null);
  }, [count]);

  const copyOne = (uuid: string, idx: number) => {
    navigator.clipboard
      .writeText(formatUuid(uuid, upper, hyphens))
      .then(() => {
        toast(t("toast_copied"));
        setCopiedIdx(idx);
        clearTimeout(copyTimeout.current);
        copyTimeout.current = setTimeout(() => setCopiedIdx(null), 1500);
      });
  };

  const copyAll = () => {
    const text = uuids.map((u) => formatUuid(u, upper, hyphens)).join("\n");
    navigator.clipboard.writeText(text).then(() => toast(t("toast_copied")));
  };

  const downloadTxt = () => {
    const text = uuids.map((u) => formatUuid(u, upper, hyphens)).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uuid-${uuids.length}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t("toast_download_ok"));
  };

  return (
    <div className="uuid-tool">
      {/* Controls bar */}
      <div className="uuid-bar">
        <div className="uuid-options">
          <div className="uuid-opt">
            <span className="uuid-opt-label">{t("uuid_count")}</span>
            <Select
              selectSize="sm"
              options={COUNT_OPTIONS}
              value={String(count)}
              onChange={(e) => setCount(Number(e.target.value))}
              style={{ width: 68 }}
            />
          </div>

          <div className="uuid-opt">
            <span className="uuid-opt-label">{t("uuid_case")}</span>
            <div className="uuid-seg">
              <button
                className={`uuid-seg-btn${!upper ? " active" : ""}`}
                onClick={() => setUpper(false)}
              >
                abc
              </button>
              <button
                className={`uuid-seg-btn${upper ? " active" : ""}`}
                onClick={() => setUpper(true)}
              >
                ABC
              </button>
            </div>
          </div>

          <div className="uuid-opt">
            <span className="uuid-opt-label">{t("uuid_hyphens")}</span>
            <div className="uuid-seg">
              <button
                className={`uuid-seg-btn${hyphens ? " active" : ""}`}
                onClick={() => setHyphens(true)}
              >
                {t("uuid_with")}
              </button>
              <button
                className={`uuid-seg-btn${!hyphens ? " active" : ""}`}
                onClick={() => setHyphens(false)}
              >
                {t("uuid_without")}
              </button>
            </div>
          </div>
        </div>

        <div className="uuid-btns">
          <Button
            size="sm"
            onClick={generate}
            leftIcon={<IconRefresh size={14} stroke={1.9} />}
          >
            {t("uuid_generate")}
          </Button>
          {uuids.length > 1 && (
            <>
              <Button
                size="sm"
                variant="subtle"
                onClick={copyAll}
                leftIcon={<IconCopy size={14} stroke={1.9} />}
              >
                {t("uuid_copy_all")}
              </Button>
              <Button
                size="sm"
                variant="subtle"
                onClick={downloadTxt}
                leftIcon={<IconDownload size={14} stroke={1.9} />}
              >
                .txt
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="subtle"
            onClick={() => {
              setUuids([]);
              setCopiedIdx(null);
            }}
            leftIcon={<IconTrash size={14} stroke={1.9} />}
          >
            {t("act_clear")}
          </Button>
        </div>
      </div>

      {/* Results */}
      {uuids.length === 0 ? (
        <div className="uuid-empty">
          <p>{t("uuid_empty")}</p>
        </div>
      ) : uuids.length === 1 ? (
        <button
          className="uuid-hero"
          onClick={() => copyOne(uuids[0], 0)}
          type="button"
        >
          <code>{formatUuid(uuids[0], upper, hyphens)}</code>
          <span className="uuid-hero-hint">
            {copiedIdx === 0 ? (
              <IconCheck size={14} stroke={2} />
            ) : (
              <IconCopy size={14} stroke={1.9} />
            )}
            {copiedIdx === 0 ? t("toast_copied") : t("act_copy")}
          </span>
        </button>
      ) : (
        <div className="uuid-list">
          <div className="uuid-list-head">
            <span className="uuid-list-count">
              {uuids.length} UUIDs
            </span>
          </div>
          {uuids.map((u, i) => {
            const display = formatUuid(u, upper, hyphens);
            const isCopied = copiedIdx === i;
            return (
              <button
                key={u}
                className={`uuid-row${isCopied ? " copied" : ""}`}
                onClick={() => copyOne(u, i)}
                type="button"
              >
                <span className="uuid-row-idx">{i + 1}</span>
                <code className="uuid-row-val">{display}</code>
                <span className="uuid-row-icon">
                  {isCopied ? (
                    <IconCheck size={13} stroke={2} />
                  ) : (
                    <IconCopy size={13} stroke={1.9} />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .uuid-tool {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ---- controls bar ---- */
        .uuid-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 12px;
        }
        .uuid-options {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          flex: 1;
        }
        .uuid-opt {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .uuid-opt-label {
          font-size: 0.7rem;
          font-family: var(--mono);
          color: var(--dim);
          letter-spacing: 0.06em;
        }

        /* segmented control */
        .uuid-seg {
          display: flex;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          background: var(--bg2);
        }
        .uuid-seg-btn {
          padding: 5px 12px;
          font-size: 0.75rem;
          font-family: var(--mono);
          font-weight: 600;
          border: none;
          background: transparent;
          color: var(--dim);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, box-shadow 0.15s;
          position: relative;
        }
        .uuid-seg-btn.active {
          background: var(--accent);
          color: #fff;
          box-shadow: 0 1px 4px color-mix(in srgb, var(--accent) 40%, transparent);
        }
        .uuid-seg-btn:not(.active):hover {
          background: var(--bg);
          color: var(--text);
        }

        .uuid-btns {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        /* ---- single hero UUID ---- */
        .uuid-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 28px 20px 20px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          cursor: pointer;
          transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
          text-align: center;
        }
        .uuid-hero:hover {
          transform: translateY(-2px);
          border-color: var(--border-h);
          box-shadow: 0 12px 30px -18px color-mix(in srgb, var(--accent) 55%, transparent);
        }
        .uuid-hero:active {
          transform: translateY(0);
        }
        .uuid-hero code {
          font-family: var(--mono);
          font-size: clamp(1rem, 3.5vw, 1.4rem);
          font-weight: 600;
          letter-spacing: 0.03em;
          color: var(--bright);
          word-break: break-all;
          line-height: 1.5;
        }
        .uuid-hero-hint {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          color: var(--dim);
          transition: color 0.15s;
        }
        .uuid-hero:hover .uuid-hero-hint {
          color: var(--accent);
        }

        /* ---- multi-list ---- */
        .uuid-list {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg2);
        }
        .uuid-list-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          border-bottom: 1px solid var(--border);
        }
        .uuid-list-count {
          font-size: 0.72rem;
          font-family: var(--mono);
          color: var(--dim);
          letter-spacing: 0.04em;
        }

        .uuid-row {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 7px 14px;
          border: none;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }
        .uuid-row:last-child {
          border-bottom: none;
        }
        .uuid-row:hover {
          background: var(--bg);
        }
        .uuid-row.copied {
          background: color-mix(in srgb, var(--ok, #22c55e) 8%, transparent);
        }
        .uuid-row-idx {
          font-size: 0.68rem;
          font-family: var(--mono);
          color: var(--dim);
          min-width: 22px;
          text-align: right;
          flex-shrink: 0;
        }
        .uuid-row-val {
          flex: 1;
          font-family: var(--mono);
          font-size: 0.82rem;
          letter-spacing: 0.02em;
          color: var(--text);
          word-break: break-all;
          line-height: 1.4;
        }
        .uuid-row-icon {
          color: var(--dim);
          flex-shrink: 0;
          transition: color 0.15s;
          display: flex;
        }
        .uuid-row:hover .uuid-row-icon {
          color: var(--accent);
        }
        .uuid-row.copied .uuid-row-icon {
          color: var(--ok, #22c55e);
        }

        /* ---- empty state ---- */
        .uuid-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          border: 1px dashed var(--border);
          border-radius: 12px;
          background: var(--bg2);
        }
        .uuid-empty p {
          font-size: 0.82rem;
          color: var(--dim);
        }

        /* ---- responsive ---- */
        @media (max-width: 640px) {
          .uuid-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .uuid-options {
            gap: 8px;
          }
          .uuid-opt {
            flex: 1;
            min-width: 0;
          }
          .uuid-seg {
            flex: 1;
          }
          .uuid-seg-btn {
            flex: 1;
            text-align: center;
          }
          .uuid-btns {
            justify-content: stretch;
          }
          .uuid-hero code {
            font-size: 0.95rem;
          }
          .uuid-row {
            padding: 8px 10px;
            gap: 6px;
          }
          .uuid-row-val {
            font-size: 0.72rem;
          }
        }
      `}</style>
    </div>
  );
}
