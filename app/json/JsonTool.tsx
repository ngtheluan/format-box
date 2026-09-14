"use client";
import { useToast } from "@/components/Toast";
import { Button, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { IconCheck, IconChevronDown, IconChevronRight, IconCopy, IconEraser, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";

type Indent = "2" | "4" | "tab";
type Status = { type: "ok" | "err" | "idle"; msg: string };

function countKeys(obj: unknown): number {
  if (typeof obj !== "object" || obj === null) return 0;
  let c = Array.isArray(obj) ? 0 : Object.keys(obj).length;
  for (const v of Object.values(obj as object)) c += countKeys(v);
  return c;
}
function maxDepth(obj: unknown, d = 0): number {
  if (typeof obj !== "object" || obj === null) return d;
  const vs = Object.values(obj as object);
  return vs.length ? Math.max(...vs.map((v) => maxDepth(v, d + 1)), d) : d;
}

function TreeNode({ data }: { data: unknown }) {
  if (data === null) return <span className="tree-null">null</span>;
  if (typeof data === "boolean") return <span className="tree-bool">{String(data)}</span>;
  if (typeof data === "number") return <span className="tree-num">{data}</span>;
  if (typeof data === "string") {
    const s = data.length > 80 ? data.slice(0, 77) + "..." : data;
    return <span className="tree-str">&quot;{s}&quot;</span>;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="tree-null">[]</span>;
    return (
      <details open>
        <summary>[{data.length} items]</summary>
        {data.map((v, i) => (
          <div key={i}>
            <span className="tree-key">{i}:</span> <TreeNode data={v} />
          </div>
        ))}
      </details>
    );
  }
  const keys = Object.keys(data as object);
  if (keys.length === 0) return <span className="tree-null">{"{}"}</span>;
  return (
    <details open>
      <summary>{`{${keys.length} keys}`}</summary>
      {keys.map((k) => (
        <div key={k}>
          <span className="tree-key">&quot;{k}&quot;:</span> <TreeNode data={(data as Record<string, unknown>)[k]} />
        </div>
      ))}
    </details>
  );
}

export default function JsonTool() {
  const toast = useToast();
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [indent, setIndent] = useState<Indent>("2");
  const [status, setStatus] = useState<Status>({ type: "idle", msg: t("json_idle") });
  const [errDetail, setErrDetail] = useState<string | null>(null);
  const [tree, setTree] = useState<unknown | undefined>(undefined);
  const [showTree, setShowTree] = useState(true);

  const indentStr = useMemo(() => (indent === "tab" ? "\t" : " ".repeat(Number(indent))), [indent]);

  const info = useMemo(() => {
    if (status.type !== "ok" || !value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      const size = new Blob([value]).size;
      return {
        type: Array.isArray(parsed) ? "Array" : "Object",
        keys: countKeys(parsed),
        depth: maxDepth(parsed),
        size: size > 1024 ? (size / 1024).toFixed(1) + " KB" : size + " B",
      };
    } catch {
      return null;
    }
  }, [status, value]);

  const onChange = (v: string) => {
    setValue(v);
    if (!v.trim()) {
      setStatus({ type: "idle", msg: t("json_idle") });
      setErrDetail(null);
      setTree(undefined);
      return;
    }
    try {
      JSON.parse(v);
      setStatus({ type: "ok", msg: t("json_valid") });
      setErrDetail(null);
    } catch (e) {
      setStatus({ type: "err", msg: t("json_invalid") });
      setErrDetail((e as Error).message);
    }
  };

  const doFormat = () => {
    const v = value.trim();
    if (!v) return;
    try {
      const parsed = JSON.parse(v);
      const out = JSON.stringify(parsed, null, indentStr);
      setValue(out);
      setStatus({ type: "ok", msg: t("json_formatted") });
      setErrDetail(null);
      setTree(parsed);
    } catch (e) {
      setStatus({ type: "err", msg: t("json_invalid") });
      setErrDetail((e as Error).message);
    }
  };

  const doMinify = () => {
    const v = value.trim();
    if (!v) return;
    try {
      const parsed = JSON.parse(v);
      const min = JSON.stringify(parsed);
      const saved = ((1 - min.length / v.length) * 100).toFixed(0);
      setValue(min);
      setStatus({ type: "ok", msg: `${t("json_minified_prefix")} ${saved}%)` });
      setErrDetail(null);
      setTree(undefined);
    } catch (e) {
      setStatus({ type: "err", msg: t("json_invalid") });
      setErrDetail((e as Error).message);
    }
  };

  const doValidate = () => {
    const v = value.trim();
    if (!v) {
      toast(t("toast_no_data"));
      return;
    }
    try {
      JSON.parse(v);
      setStatus({ type: "ok", msg: t("json_valid") });
      setErrDetail(null);
      toast(t("toast_valid_json"));
    } catch (e) {
      setStatus({ type: "err", msg: t("json_invalid") });
      setErrDetail((e as Error).message);
    }
  };

  const doCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => toast(t("toast_copied")));
  };

  const doClear = () => {
    setValue("");
    setStatus({ type: "idle", msg: t("json_idle") });
    setErrDetail(null);
    setTree(undefined);
  };

  return (
    <div className="tool-card">
      <div className="jt-root">
        {/* ── Toolbar ── */}
        <div className="jt-toolbar">
          <div className="jt-actions">
            <Button size="sm" onClick={doFormat}>
              {t("act_format")}
            </Button>
            <Button size="sm" variant="subtle" onClick={doMinify}>
              {t("act_minify")}
            </Button>
            <Button size="sm" variant="subtle" onClick={doValidate}>
              {t("act_validate")}
            </Button>
            <Button size="sm" variant="subtle" onClick={doCopy} leftIcon={<IconCopy size={14} stroke={1.8} />}>
              {t("act_copy")}
            </Button>
            <Button size="sm" variant="subtle" onClick={doClear} leftIcon={<IconEraser size={14} stroke={1.8} />}>
              {t("act_clear")}
            </Button>
          </div>

          <div className="jt-toolbar-mid">
            <span className="jt-indent-label">{t("json_indent")}</span>
            {(["2", "4", "tab"] as Indent[]).map((i) => (
              <button key={i} className={`indent-btn${indent === i ? " active" : ""}`} onClick={() => setIndent(i)}>
                {i === "tab" ? t("json_tab") : `${i}`}
              </button>
            ))}
          </div>

          <div className={`jt-status ${status.type}`}>
            {status.type === "ok" && <IconCheck size={12} stroke={2.5} />}
            {status.type === "err" && <IconX size={12} stroke={2.5} />}
            {status.msg}
          </div>
        </div>

        {/* ── Error strip ── */}
        {errDetail && <div className="jt-err">{errDetail}</div>}

        {/* ── Split pane ── */}
        <div className="jt-split">
          {/* Input */}
          <div className="jt-pane">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder='{"name": "FormatBox", "version": 1}'
              className="jt-textarea"
              monospace
            />
          </div>

          <div className="jt-divider" />

          {/* Output */}
          <div className="jt-pane jt-out-pane">
            {info && (
              <div className="jt-meta">
                <span className="jt-badge">{info.type === "Array" ? t("json_type_array") : t("json_type_object")}</span>
                <span className="jt-badge">
                  {info.keys} {t("json_keys")}
                </span>
                <span className="jt-badge">
                  {t("json_depth")} {info.depth}
                </span>
                <span className="jt-badge jt-badge-size">{info.size}</span>
              </div>
            )}

            {tree !== undefined ? (
              <div className="jt-tree-wrap">
                <button className="jt-tree-toggle" onClick={() => setShowTree((v) => !v)}>
                  {showTree ? <IconChevronDown size={13} stroke={2} /> : <IconChevronRight size={13} stroke={2} />}
                  {t("json_tree_view")}
                </button>
                {showTree && (
                  <div className="jt-tree">
                    <TreeNode data={tree} />
                  </div>
                )}
              </div>
            ) : (
              <div className="jt-empty">{t("json_empty")}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
