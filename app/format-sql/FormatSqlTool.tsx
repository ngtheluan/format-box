"use client";
import { useToast } from "@/components/Toast";
import { Button, IconButton, Select, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowsUpDown,
  IconClipboard,
  IconCopy,
  IconDownload,
  IconSparkles,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { format as formatSql, type FormatOptionsWithLanguage, type SqlLanguage } from "sql-formatter";
import { useEffect, useMemo, useRef, useState } from "react";

type KeywordCase = "preserve" | "upper" | "lower";
type Indent = "2" | "4" | "tab";

const DIALECTS: { value: SqlLanguage; label: string }[] = [
  { value: "sql", label: "Standard SQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mariadb", label: "MariaDB" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "transactsql", label: "SQL Server (T-SQL)" },
  { value: "plsql", label: "Oracle (PL/SQL)" },
  { value: "db2", label: "DB2" },
  { value: "bigquery", label: "BigQuery" },
  { value: "redshift", label: "Redshift" },
  { value: "spark", label: "Spark" },
  { value: "hive", label: "Hive" },
  { value: "trino", label: "Trino" },
  { value: "n1ql", label: "Couchbase N1QL" },
  { value: "singlestoredb", label: "SingleStoreDB" },
  { value: "tidb", label: "TiDB" },
];

const SAMPLE = `SELECT u.id, u.name, u.email, COUNT(o.id) AS total_orders, SUM(o.amount) AS revenue
FROM users u LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at >= '2024-01-01' AND u.status IN ('active','trial')
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 5
ORDER BY revenue DESC
LIMIT 50;`;

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function minifySql(src: string) {
  let out = "";
  let i = 0;
  let lastSpace = false;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < src.length) {
        const ch = src[i];
        out += ch;
        if (ch === "\\" && i + 1 < src.length) {
          out += src[i + 1];
          i += 2;
          continue;
        }
        i++;
        if (ch === quote) break;
      }
      lastSpace = false;
      continue;
    }
    if (c === "-" && next === "-") {
      while (i < src.length && src[i] !== "\n") i++;
      if (!lastSpace && out.length) {
        out += " ";
        lastSpace = true;
      }
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      if (!lastSpace && out.length) {
        out += " ";
        lastSpace = true;
      }
      continue;
    }
    if (/\s/.test(c)) {
      if (!lastSpace && out.length) {
        out += " ";
        lastSpace = true;
      }
      i++;
      continue;
    }
    out += c;
    lastSpace = false;
    i++;
  }
  return out.trim();
}

export default function FormatSqlTool() {
  const { t } = useI18n();
  const toast = useToast();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [dialect, setDialect] = useState<SqlLanguage>("sql");
  const [indent, setIndent] = useState<Indent>("2");
  const [keywordCase, setKeywordCase] = useState<KeywordCase>("upper");
  const [live, setLive] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const options = useMemo<FormatOptionsWithLanguage>(
    () => ({
      language: dialect,
      tabWidth: indent === "tab" ? 1 : Number(indent),
      useTabs: indent === "tab",
      keywordCase: keywordCase === "preserve" ? "preserve" : keywordCase,
      linesBetweenQueries: 2,
    }),
    [dialect, indent, keywordCase],
  );

  function doFormat(src = input) {
    if (!src.trim()) {
      setOutput("");
      setError("");
      return;
    }
    try {
      const result = formatSql(src, options);
      setOutput(result);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function doMinify() {
    if (!input.trim()) return;
    try {
      setOutput(minifySql(input));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    if (!live) return;
    const id = setTimeout(() => doFormat(input), 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, dialect, indent, keywordCase, live]);

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast(t("fsql_copied"));
    } catch {
      toast(t("fsql_copy_fail"));
    }
  }

  async function pasteIn() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInput(text);
    } catch {
      toast(t("fsql_paste_fail"));
    }
  }

  function downloadOutput() {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.sql";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(f: File | null) {
    if (!f) return;
    f.text().then(setInput);
  }

  function swap() {
    setInput(output);
    setOutput("");
  }

  const inputBytes = useMemo(() => new Blob([input]).size, [input]);
  const outputBytes = useMemo(() => new Blob([output]).size, [output]);

  return (
    <div className="fsql">
      <div className="fsql-toolbar">
        <div className="fsql-opts">
          <label className="fsql-opt">
            <span>{t("fsql_dialect")}</span>
            <Select
              selectSize="sm"
              value={dialect}
              onChange={(e) => setDialect(e.target.value as SqlLanguage)}
              options={DIALECTS}
            />
          </label>
          <label className="fsql-opt">
            <span>{t("fsql_indent")}</span>
            <Select
              selectSize="sm"
              value={indent}
              onChange={(e) => setIndent(e.target.value as Indent)}
              options={[
                { value: "2", label: "2 spaces" },
                { value: "4", label: "4 spaces" },
                { value: "tab", label: "Tab" },
              ]}
            />
          </label>
          <label className="fsql-opt">
            <span>{t("fsql_keywords")}</span>
            <Select
              selectSize="sm"
              value={keywordCase}
              onChange={(e) => setKeywordCase(e.target.value as KeywordCase)}
              options={[
                { value: "upper", label: "UPPER" },
                { value: "lower", label: "lower" },
                { value: "preserve", label: t("fsql_preserve") },
              ]}
            />
          </label>
          <label className="fsql-live">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
            <span>{t("fsql_live")}</span>
          </label>
        </div>
        <div className="fsql-actions">
          <Button size="sm" variant="primary" onClick={() => doFormat()} leftIcon={<IconSparkles size={16} />}>
            {t("fsql_format")}
          </Button>
          <Button size="sm" variant="subtle" onClick={doMinify}>
            {t("fsql_minify")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setInput(SAMPLE)}>
            {t("fsql_sample")}
          </Button>
        </div>
      </div>

      <div className="fsql-grid">
        <div className="fsql-pane">
          <div className="fsql-pane-head">
            <span className="fsql-pane-title">{t("fsql_input")}</span>
            <div className="fsql-pane-meta">
              <span>{input.split("\n").length} dòng</span>
              <span>·</span>
              <span>{bytes(inputBytes)}</span>
            </div>
            <div className="fsql-pane-tools">
              <IconButton size="sm" variant="ghost" aria-label="Paste" onClick={pasteIn}>
                <IconClipboard size={16} />
              </IconButton>
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Upload"
                onClick={() => fileRef.current?.click()}
              >
                <IconUpload size={16} />
              </IconButton>
              <IconButton size="sm" variant="ghost" aria-label="Clear" onClick={() => setInput("")}>
                <IconTrash size={16} />
              </IconButton>
              <input
                ref={fileRef}
                type="file"
                accept=".sql,.txt,text/plain"
                hidden
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <Textarea
            className="fsql-ta"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("fsql_input_ph")}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        <div className="fsql-pane">
          <div className="fsql-pane-head">
            <span className="fsql-pane-title">{t("fsql_output")}</span>
            <div className="fsql-pane-meta">
              <span>{output.split("\n").length} dòng</span>
              <span>·</span>
              <span>{bytes(outputBytes)}</span>
            </div>
            <div className="fsql-pane-tools">
              <IconButton size="sm" variant="ghost" aria-label="Swap" onClick={swap}>
                <IconArrowsUpDown size={16} />
              </IconButton>
              <IconButton size="sm" variant="ghost" aria-label="Copy" onClick={copyOutput}>
                <IconCopy size={16} />
              </IconButton>
              <IconButton size="sm" variant="ghost" aria-label="Download" onClick={downloadOutput}>
                <IconDownload size={16} />
              </IconButton>
            </div>
          </div>
          <Textarea
            className="fsql-ta"
            value={output}
            readOnly
            placeholder={t("fsql_output_ph")}
            spellCheck={false}
          />
        </div>
      </div>

      {error && <div className="fsql-err">{error}</div>}

      <style jsx>{`
        .fsql {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .fsql-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px;
          background: var(--bg-elev, var(--bg));
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .fsql-opts {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .fsql-opt {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 11px;
          color: var(--muted);
        }
        .fsql-opt span {
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .fsql-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text);
          user-select: none;
          align-self: flex-end;
          padding-bottom: 6px;
        }
        .fsql-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .fsql-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 860px) {
          .fsql-grid {
            grid-template-columns: 1fr;
          }
        }
        .fsql-pane {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          background: var(--bg);
          min-height: 420px;
        }
        .fsql-pane-head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: var(--bg-elev, var(--bg));
          border-bottom: 1px solid var(--border);
          font-size: 12px;
        }
        .fsql-pane-title {
          font-weight: 600;
          color: var(--text);
        }
        .fsql-pane-meta {
          display: inline-flex;
          gap: 6px;
          color: var(--muted);
          font-size: 11px;
        }
        .fsql-pane-tools {
          margin-left: auto;
          display: inline-flex;
          gap: 2px;
        }
        .fsql :global(.fsql-ta) {
          flex: 1;
          border: none;
          border-radius: 0;
          background: transparent;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 13px;
          line-height: 1.55;
          min-height: 380px;
          resize: vertical;
        }
        .fsql-err {
          padding: 8px 12px;
          background: color-mix(in oklab, var(--err) 12%, transparent);
          color: var(--err);
          border: 1px solid color-mix(in oklab, var(--err) 40%, transparent);
          border-radius: 8px;
          font-size: 13px;
          white-space: pre-wrap;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
      `}</style>
    </div>
  );
}
