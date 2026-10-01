"use client";
import { useToast } from "@/components/Toast";
import { Button, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { IconCheck, IconChevronDown, IconChevronRight, IconCopy, IconEraser, IconX } from "@tabler/icons-react";
import { Fragment, forwardRef, memo, useMemo, useRef, useState } from "react";

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

// Lấy số dòng lỗi từ message của JSON.parse: "line N" (Chrome mới, Firefox) hoặc "position N" (Chrome/Node cũ)
// Lỗi luôn được tính trên text đã trim(), nên cộng thêm số dòng trống ở đầu.
function errorLine(msg: string | null, text: string): number | null {
  if (!msg) return null;
  const lead = text.length - text.trimStart().length;
  const byLine = msg.match(/line (\d+)/);
  if (byLine) return Number(byLine[1]) + text.slice(0, lead).split("\n").length - 1;
  const byPos = msg.match(/position (\d+)/);
  if (byPos) return text.slice(0, lead + Number(byPos[1])).split("\n").length;
  return null;
}

const Gutter = memo(
  forwardRef<HTMLDivElement, { count: number; errLine: number | null }>(function Gutter({ count, errLine }, ref) {
    return (
      <div className="jt-gutter" ref={ref} aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={i + 1 === errLine ? "jt-gutter-err" : undefined}>
            {i + 1}
          </div>
        ))}
      </div>
    );
  }),
);

function renderPrimitive(v: unknown) {
  if (v === null) return <span className="tree-null">null</span>;
  if (typeof v === "boolean") return <span className="tree-bool">{String(v)}</span>;
  if (typeof v === "number") return <span className="tree-num">{v}</span>;
  if (typeof v === "string")
    return <span className="tree-str">&quot;{v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}&quot;</span>;
  return null;
}

type LineCtx = {
  n: number;
  collapsed: Set<string>;
  toggle: (id: string) => void;
};

function Row({
  line,
  indent,
  children,
  toggle,
  onToggle,
}: {
  line: number;
  indent: number;
  children: React.ReactNode;
  toggle?: { id: string; open: boolean };
  onToggle?: (id: string) => void;
}) {
  return (
    <div className={`jt-line${toggle ? " jt-line-opener" : ""}`}>
      <span className="jt-ln">{line}</span>
      <span className="jt-lc" style={{ paddingLeft: indent * 14 }}>
        {toggle && onToggle ? (
          <button
            className="jt-caret"
            onClick={() => onToggle(toggle.id)}
            aria-label={toggle.open ? "collapse" : "expand"}
          >
            {toggle.open ? <IconChevronDown size={12} stroke={2.2} /> : <IconChevronRight size={12} stroke={2.2} />}
          </button>
        ) : (
          <span className="jt-caret jt-caret-spacer" />
        )}
        {children}
      </span>
    </div>
  );
}

function renderNode({
  ctx,
  value,
  indent,
  path,
  prefix,
  suffix,
}: {
  ctx: LineCtx;
  value: unknown;
  indent: number;
  path: string;
  prefix?: React.ReactNode;
  suffix?: string;
}): React.ReactNode {
  const isArr = Array.isArray(value);
  const isObj = !isArr && typeof value === "object" && value !== null;

  if (!isArr && !isObj) {
    const ln = ++ctx.n;
    return (
      <Row key={path || "$"} line={ln} indent={indent}>
        {prefix}
        {renderPrimitive(value)}
        {suffix}
      </Row>
    );
  }

  const entries = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  const open = isArr ? "[" : "{";
  const close = isArr ? "]" : "}";

  if (entries.length === 0) {
    const ln = ++ctx.n;
    return (
      <Row key={path || "$"} line={ln} indent={indent}>
        {prefix}
        <span className="tree-null">{open + close}</span>
        {suffix}
      </Row>
    );
  }

  const blockId = path || "$";
  const collapsed = ctx.collapsed.has(blockId);
  const openLine = ++ctx.n;

  const openRow = (
    <Row
      line={openLine}
      indent={indent}
      toggle={{ id: blockId, open: !collapsed }}
      onToggle={ctx.toggle}
    >
      {prefix}
      <span className="tree-brace">{open}</span>
      {collapsed && (
        <>
          <span className="jt-ellipsis" onClick={() => ctx.toggle(blockId)}>
            {isArr ? `${entries.length} items` : `${entries.length} keys`}
          </span>
          <span className="tree-brace">{close}</span>
          {suffix}
        </>
      )}
    </Row>
  );

  if (collapsed) return <Fragment key={blockId}>{openRow}</Fragment>;

  const childNodes = entries.map(([k, v], i) => {
    const last = i === entries.length - 1;
    const childPrefix = isArr ? null : (
      <>
        <span className="tree-key">&quot;{k}&quot;</span>
        <span className="tree-colon">: </span>
      </>
    );
    return renderNode({
      ctx,
      value: v,
      indent: indent + 1,
      path: `${blockId}.${k}`,
      prefix: childPrefix,
      suffix: last ? "" : ",",
    });
  });

  const closeLine = ++ctx.n;

  return (
    <Fragment key={blockId}>
      {openRow}
      <div
        className="jt-block"
        data-block={blockId}
        style={{ ["--jt-guide-x" as string]: `${indent * 14 + 7}px` }}
      >
        {childNodes}
      </div>
      <Row line={closeLine} indent={indent}>
        <span className="tree-brace">{close}</span>
        {suffix}
      </Row>
    </Fragment>
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleBlock = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = useMemo(() => value.split("\n").length, [value]);
  const errLine = useMemo(() => errorLine(errDetail, value), [errDetail, value]);

  const indentStr = useMemo(() => (indent === "tab" ? "\t" : " ".repeat(Number(indent))), [indent]);

  const info = useMemo(() => {
    if (status.type !== "ok" || !value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      const size = new Blob([value]).size;
      return {
        type: Array.isArray(parsed) ? "Array" : typeof parsed === "string" ? "String" : "Object",
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
      JSON.parse(v.trim());
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

  // JSON → chuỗi đã escape, ví dụ {"a":1} → "{\"a\":1}"
  const doToString = () => {
    const v = value.trim();
    if (!v) return;
    try {
      const parsed = JSON.parse(v);
      setValue(JSON.stringify(JSON.stringify(parsed)));
      setStatus({ type: "ok", msg: t("json_stringified") });
      setErrDetail(null);
      setTree(undefined);
    } catch (e) {
      setStatus({ type: "err", msg: t("json_invalid") });
      setErrDetail((e as Error).message);
    }
  };

  // Chuỗi đã escape → JSON. Chấp nhận cả dạng có hoặc không có dấu nháy bao ngoài.
  const doFromString = () => {
    const v = value.trim();
    if (!v) return;
    let inner: unknown;
    try {
      inner = JSON.parse(v);
    } catch {
      try {
        inner = JSON.parse(`"${v}"`);
      } catch (e) {
        setStatus({ type: "err", msg: t("json_not_string") });
        setErrDetail((e as Error).message);
        return;
      }
    }
    if (typeof inner !== "string") {
      setStatus({ type: "err", msg: t("json_not_string") });
      setErrDetail(null);
      return;
    }
    try {
      const parsed = JSON.parse(inner);
      setValue(JSON.stringify(parsed, null, indentStr));
      setStatus({ type: "ok", msg: t("json_unstringified") });
      setErrDetail(null);
      setTree(parsed);
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
            <Button size="sm" variant="subtle" onClick={doToString}>
              {t("act_json_to_string")}
            </Button>
            <Button size="sm" variant="subtle" onClick={doFromString}>
              {t("act_string_to_json")}
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
          <div className="jt-pane jt-editor">
            <Gutter ref={gutterRef} count={lineCount} errLine={errLine} />
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onScroll={(e) => {
                if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
              }}
              placeholder='{"name": "FormatBox", "version": 1}'
              className="jt-textarea"
              wrap="off"
              spellCheck={false}
              monospace
            />
          </div>

          <div className="jt-divider" />

          {/* Output */}
          <div className="jt-pane jt-out-pane">
            {info && (
              <div className="jt-meta">
                <span className="jt-badge">
                  {info.type === "Array"
                    ? t("json_type_array")
                    : info.type === "String"
                      ? t("json_type_string")
                      : t("json_type_object")}
                </span>
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
                    {renderNode({
                      ctx: { n: 0, collapsed, toggle: toggleBlock },
                      value: tree,
                      indent: 0,
                      path: "",
                    })}
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
