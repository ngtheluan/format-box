"use client";
import { useMemo, useState } from "react";
import {
  IconCheck,
  IconX,
  IconCopy,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";
import { useToast } from "@/components/Toast";

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
          <span className="tree-key">&quot;{k}&quot;:</span>{" "}
          <TreeNode data={(data as Record<string, unknown>)[k]} />
        </div>
      ))}
    </details>
  );
}

export default function JsonTool() {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [indent, setIndent] = useState<Indent>("2");
  const [status, setStatus] = useState<Status>({ type: "idle", msg: "Paste JSON để bắt đầu" });
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
      setStatus({ type: "idle", msg: "Paste JSON để bắt đầu" });
      setErrDetail(null);
      setTree(undefined);
      return;
    }
    try {
      JSON.parse(v);
      setStatus({ type: "ok", msg: "JSON hợp lệ" });
      setErrDetail(null);
    } catch (e) {
      setStatus({ type: "err", msg: "JSON không hợp lệ" });
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
      setStatus({ type: "ok", msg: "Đã format" });
      setErrDetail(null);
      setTree(parsed);
    } catch (e) {
      setStatus({ type: "err", msg: "JSON không hợp lệ" });
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
      setStatus({ type: "ok", msg: `Đã minify (giảm ${saved}%)` });
      setErrDetail(null);
      setTree(undefined);
    } catch (e) {
      setStatus({ type: "err", msg: "JSON không hợp lệ" });
      setErrDetail((e as Error).message);
    }
  };

  const doValidate = () => {
    const v = value.trim();
    if (!v) {
      toast("Chưa có dữ liệu");
      return;
    }
    try {
      JSON.parse(v);
      setStatus({ type: "ok", msg: "JSON hợp lệ" });
      setErrDetail(null);
      toast("JSON hợp lệ");
    } catch (e) {
      setStatus({ type: "err", msg: "JSON không hợp lệ" });
      setErrDetail((e as Error).message);
    }
  };

  const doCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => toast("Đã copy"));
  };

  const doClear = () => {
    setValue("");
    setStatus({ type: "idle", msg: "Paste JSON để bắt đầu" });
    setErrDetail(null);
    setTree(undefined);
  };

  return (
    <>
      <div className={`status ${status.type}`}>
        {status.type === "ok" && <IconCheck size={14} stroke={2.4} />}
        {status.type === "err" && <IconX size={14} stroke={2.4} />}
        {status.msg}
      </div>

      <label>Input JSON</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='{"name": "FormatBox", "type": "tool", "features": ["format", "validate", "minify"]}'
        style={{ height: 240 }}
      />

      <div className="indent-row">
        <span style={{ fontSize: ".8rem", color: "var(--dim)" }}>Indent:</span>
        {(["2", "4", "tab"] as Indent[]).map((i) => (
          <button
            key={i}
            className={`indent-btn${indent === i ? " active" : ""}`}
            onClick={() => setIndent(i)}
          >
            {i === "tab" ? "Tab" : `${i} spaces`}
          </button>
        ))}
      </div>

      <div className="actions">
        <button className="btn btn-p" onClick={doFormat}>Format</button>
        <button className="btn btn-s" onClick={doMinify}>Minify</button>
        <button className="btn btn-s" onClick={doValidate}>Validate</button>
        <button className="btn btn-s" onClick={doCopy}>
          <IconCopy size={15} stroke={1.8} /> Copy
        </button>
        <button className="btn btn-s" onClick={doClear}>Xóa</button>
      </div>

      {errDetail && <div className="err-detail">{errDetail}</div>}

      {info && (
        <div className="info">
          <span className="info-i">{info.type}</span>
          <span className="info-i">{info.keys} keys</span>
          <span className="info-i">depth {info.depth}</span>
          <span className="info-i">{info.size}</span>
        </div>
      )}

      {tree !== undefined && (
        <div className="tree-wrap">
          <div className="tree-toggle" onClick={() => setShowTree((v) => !v)}>
            {showTree ? <IconChevronDown size={14} stroke={2} /> : <IconChevronRight size={14} stroke={2} />}
            Tree view
          </div>
          {showTree && (
            <div className="tree">
              <TreeNode data={tree} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
