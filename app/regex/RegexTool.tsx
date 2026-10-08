"use client";
import { useMemo, useState, type ReactNode } from "react";
import { IconCopy, IconTrash, IconAlertTriangle } from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { Button, Input, Textarea } from "@/components/ui";

type FlagKey = "g" | "i" | "m" | "s" | "u" | "y";

const FLAGS: { key: FlagKey; vi: string; en: string }[] = [
  { key: "g", vi: "Tìm tất cả", en: "Global" },
  { key: "i", vi: "Không phân biệt hoa thường", en: "Ignore case" },
  { key: "m", vi: "Nhiều dòng", en: "Multiline" },
  { key: "s", vi: "Dấu . khớp cả xuống dòng", en: "Dot matches newline" },
  { key: "u", vi: "Unicode", en: "Unicode" },
  { key: "y", vi: "Sticky", en: "Sticky" },
];

type MatchHit = {
  index: number;
  value: string;
  groups: string[];
  named: Record<string, string>;
};

const SAMPLE_PATTERN = "(\\w+)@(\\w+\\.\\w+)";
const SAMPLE_TEXT =
  "Liên hệ: hello@format-box.vn hoặc support@example.com để biết thêm chi tiết.";

export default function RegexTool() {
  const toast = useToast();
  const { lang, t } = useI18n();
  const vi = lang === "vi";

  const [pattern, setPattern] = useState(SAMPLE_PATTERN);
  const [flags, setFlags] = useState<Set<FlagKey>>(() => new Set(["g"] as FlagKey[]));
  const [text, setText] = useState(SAMPLE_TEXT);

  const flagStr = useMemo(() => FLAGS.map((f) => f.key).filter((k) => flags.has(k)).join(""), [flags]);

  const { regex, error } = useMemo(() => {
    if (!pattern) return { regex: null as RegExp | null, error: null as string | null };
    try {
      return { regex: new RegExp(pattern, flagStr), error: null };
    } catch (e) {
      return { regex: null, error: (e as Error).message };
    }
  }, [pattern, flagStr]);

  const matches = useMemo<MatchHit[]>(() => {
    if (!regex || !text) return [];
    const out: MatchHit[] = [];
    if (regex.global || regex.sticky) {
      let m: RegExpExecArray | null;
      let safety = 0;
      while ((m = regex.exec(text)) !== null) {
        out.push({
          index: m.index,
          value: m[0],
          groups: m.slice(1).map((g) => g ?? ""),
          named: { ...(m.groups ?? {}) },
        });
        if (m.index === regex.lastIndex) regex.lastIndex++;
        if (++safety > 10000) break;
      }
      regex.lastIndex = 0;
    } else {
      const m = regex.exec(text);
      if (m) {
        out.push({
          index: m.index,
          value: m[0],
          groups: m.slice(1).map((g) => g ?? ""),
          named: { ...(m.groups ?? {}) },
        });
      }
    }
    return out;
  }, [regex, text]);

  const highlighted = useMemo<ReactNode[]>(() => {
    if (!matches.length) return [text];
    const parts: ReactNode[] = [];
    let cursor = 0;
    matches.forEach((m, i) => {
      if (m.index > cursor) parts.push(text.slice(cursor, m.index));
      parts.push(
        <mark key={`${i}-${m.index}`} className="rx-mark">
          {m.value || "​"}
        </mark>,
      );
      cursor = m.index + m.value.length;
    });
    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts;
  }, [matches, text]);

  const toggleFlag = (k: FlagKey) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const copy = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => toast(t("toast_copied")));
  };

  const copyFull = () => {
    if (!regex) return;
    copy(`/${pattern}/${flagStr}`);
  };

  return (
    <div className="rx-tool">
      <div className="rx-row">
        <div className="rx-slash">/</div>
        <Input
          className="rx-pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder={vi ? "Nhập biểu thức chính quy" : "Enter a regular expression"}
          spellCheck={false}
          aria-label={vi ? "Biểu thức" : "Pattern"}
        />
        <div className="rx-slash">/{flagStr}</div>
        <Button size="sm" variant="subtle" onClick={copyFull} leftIcon={<IconCopy size={14} stroke={1.9} />}>
          {vi ? "Copy regex" : "Copy regex"}
        </Button>
      </div>

      <div className="rx-flags">
        {FLAGS.map((f) => {
          const on = flags.has(f.key);
          return (
            <button
              key={f.key}
              type="button"
              className={`rx-flag${on ? " on" : ""}`}
              onClick={() => toggleFlag(f.key)}
              title={vi ? f.vi : f.en}
            >
              <code>{f.key}</code>
              <span>{vi ? f.vi : f.en}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rx-err">
          <IconAlertTriangle size={14} stroke={2} />
          <span>{error}</span>
        </div>
      )}

      <div className="rx-input-wrap">
        <label>{vi ? "Chuỗi kiểm thử" : "Test string"}</label>
        <Textarea
          className="rx-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={vi ? "Dán chuỗi cần kiểm tra" : "Paste the string to test"}
          spellCheck={false}
          rows={6}
        />
        <div className="actions">
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setText("")}
            leftIcon={<IconTrash size={14} stroke={1.9} />}
          >
            {t("act_clear")}
          </Button>
        </div>
      </div>

      <div className="rx-section">
        <div className="rx-section-head">
          <b>{vi ? "Highlight" : "Highlight"}</b>
          <span className="rx-count">
            {matches.length} {vi ? "kết quả" : matches.length === 1 ? "match" : "matches"}
          </span>
        </div>
        <pre className="rx-highlight">{highlighted}</pre>
      </div>

      <div className="rx-section">
        <div className="rx-section-head">
          <b>{vi ? "Chi tiết" : "Details"}</b>
        </div>
        {matches.length === 0 ? (
          <div className="rx-empty">{vi ? "Chưa khớp mẫu nào." : "No matches yet."}</div>
        ) : (
          <div className="rx-list">
            {matches.map((m, i) => (
              <div key={i} className="rx-item">
                <div className="rx-item-head">
                  <span className="rx-idx">#{i + 1}</span>
                  <code className="rx-val">{m.value}</code>
                  <span className="rx-pos">
                    {vi ? "vị trí" : "at"} {m.index}
                  </span>
                  <button
                    type="button"
                    className="rx-copy"
                    onClick={() => copy(m.value)}
                    title={t("act_copy")}
                  >
                    <IconCopy size={13} stroke={1.9} />
                  </button>
                </div>
                {(m.groups.length > 0 || Object.keys(m.named).length > 0) && (
                  <div className="rx-groups">
                    {m.groups.map((g, gi) => (
                      <div key={gi} className="rx-group">
                        <span className="rx-group-k">${gi + 1}</span>
                        <code>{g || <em>—</em>}</code>
                      </div>
                    ))}
                    {Object.entries(m.named).map(([k, v]) => (
                      <div key={k} className="rx-group">
                        <span className="rx-group-k">{k}</span>
                        <code>{v || <em>—</em>}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .rx-tool {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .rx-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .rx-slash {
          font-family: var(--mono);
          color: var(--dim);
          font-size: 1rem;
        }
        .rx-pattern {
          flex: 1 1 240px;
          font-family: var(--mono);
        }
        .rx-flags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .rx-flag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          font-size: 0.72rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg2);
          color: var(--dim);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .rx-flag code {
          font-family: var(--mono);
          font-weight: 700;
          font-size: 0.78rem;
          color: var(--text);
        }
        .rx-flag.on {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
        .rx-flag.on code {
          color: #fff;
        }
        .rx-flag:not(.on):hover {
          border-color: var(--border-h);
          color: var(--text);
        }
        .rx-err {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          background: color-mix(in srgb, #ef4444 10%, transparent);
          color: #ef4444;
          font-family: var(--mono);
          font-size: 0.78rem;
        }
        .rx-input-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rx-input-wrap label {
          font-size: 0.72rem;
          color: var(--dim);
          font-family: var(--mono);
          letter-spacing: 0.04em;
        }
        .rx-input {
          font-family: var(--mono);
        }
        .rx-input-wrap .actions {
          display: flex;
          gap: 6px;
        }
        .rx-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rx-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.78rem;
        }
        .rx-count {
          font-family: var(--mono);
          color: var(--dim);
          font-size: 0.72rem;
        }
        .rx-highlight {
          margin: 0;
          padding: 12px 14px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-family: var(--mono);
          font-size: 0.82rem;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 240px;
          overflow: auto;
        }
        .rx-highlight :global(.rx-mark) {
          background: color-mix(in srgb, var(--accent) 28%, transparent);
          color: var(--bright);
          border-radius: 3px;
          padding: 0 2px;
        }
        .rx-empty {
          padding: 20px;
          border: 1px dashed var(--border);
          border-radius: 10px;
          text-align: center;
          color: var(--dim);
          font-size: 0.82rem;
        }
        .rx-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rx-item {
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg2);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rx-item-head {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .rx-idx {
          font-family: var(--mono);
          color: var(--dim);
          font-size: 0.72rem;
        }
        .rx-val {
          font-family: var(--mono);
          font-size: 0.82rem;
          color: var(--bright);
          background: color-mix(in srgb, var(--accent) 10%, transparent);
          padding: 2px 6px;
          border-radius: 4px;
          word-break: break-all;
        }
        .rx-pos {
          font-family: var(--mono);
          color: var(--dim);
          font-size: 0.7rem;
        }
        .rx-copy {
          margin-left: auto;
          border: none;
          background: transparent;
          color: var(--dim);
          cursor: pointer;
          padding: 2px;
          display: inline-flex;
          align-items: center;
          transition: color 0.15s;
        }
        .rx-copy:hover {
          color: var(--accent);
        }
        .rx-groups {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-left: 12px;
          border-left: 2px solid var(--border);
        }
        .rx-group {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
        }
        .rx-group-k {
          min-width: 36px;
          font-family: var(--mono);
          color: var(--dim);
          font-size: 0.72rem;
        }
        .rx-group code {
          font-family: var(--mono);
          color: var(--text);
          word-break: break-all;
        }
        .rx-group em {
          color: var(--dim);
          font-style: normal;
        }
      `}</style>
    </div>
  );
}
