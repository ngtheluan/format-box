"use client";
import { useToast } from "@/components/Toast";
import { Button, Input, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClipboard,
  IconCopy,
  IconDownload,
  IconEraser,
  IconFoldDown,
  IconFoldUp,
  IconKeyboard,
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightExpand,
  IconLink,
  IconSearch,
  IconSortAZ,
  IconSparkles,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { Fragment, forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Indent = "2" | "4" | "tab";
type Status = { type: "ok" | "err" | "idle"; msg: string };
type PaneHide = "none" | "input" | "output";

const SAMPLE = `{
  "name": "FormatBox",
  "version": "1.0.0",
  "features": ["format", "validate", "minify", "tree view"],
  "author": {
    "name": "ngtheluan",
    "email": "nguyenluan.work@gmail.com"
  },
  "stars": 128,
  "active": true,
  "tags": null
}`;

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

function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v && typeof v === "object") {
    return Object.keys(v as Record<string, unknown>)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeysDeep((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}

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

function parseStringJson(text: string): unknown {
  const v = text.trim();
  if (!v) return undefined;
  let inner: unknown;
  try {
    inner = JSON.parse(v);
  } catch {
    try {
      inner = JSON.parse(`"${v}"`);
    } catch {
      return undefined;
    }
  }
  if (typeof inner !== "string") return undefined;
  try {
    return JSON.parse(inner);
  } catch {
    return undefined;
  }
}

function renderPrimitive(v: unknown) {
  if (v === null) return <span className="tree-null">null</span>;
  if (typeof v === "boolean") return <span className="tree-bool">{String(v)}</span>;
  if (typeof v === "number") return <span className="tree-num">{v}</span>;
  if (typeof v === "string")
    return <span className="tree-str">&quot;{v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}&quot;</span>;
  return null;
}

function collectBlockIds(value: unknown, path = "", out: string[] = []): string[] {
  const isArr = Array.isArray(value);
  const isObj = !isArr && typeof value === "object" && value !== null;
  if (!isArr && !isObj) return out;
  const id = path || "$";
  const entries = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  if (entries.length > 0) out.push(id);
  for (const [k, v] of entries) collectBlockIds(v, `${id}.${k}`, out);
  return out;
}

function formatJsonPath(path: string): string {
  if (!path || path === "$") return "$";
  const parts = path.split(".");
  let out = "$";
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    if (/^\d+$/.test(p)) out += `[${p}]`;
    else if (/^[a-zA-Z_$][\w$]*$/.test(p)) out += `.${p}`;
    else out += `[${JSON.stringify(p)}]`;
  }
  return out;
}

type Visibility = { visible: Set<string>; match: Set<string> } | null;

function buildVisibility(value: unknown, q: string): Visibility {
  if (!q.trim()) return null;
  const visible = new Set<string>();
  const match = new Set<string>();
  const lower = q.toLowerCase();

  function walk(v: unknown, path: string, parentKeyHit: boolean): boolean {
    const id = path || "$";
    let hit = parentKeyHit;

    if (Array.isArray(v)) {
      v.forEach((child, i) => {
        if (walk(child, `${id}.${i}`, false)) hit = true;
      });
    } else if (v !== null && typeof v === "object") {
      for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
        const kHit = k.toLowerCase().includes(lower);
        const sub = walk(child, `${id}.${k}`, kHit);
        if (kHit || sub) hit = true;
      }
    } else {
      const text = v === null ? "null" : String(v);
      if (text.toLowerCase().includes(lower)) {
        hit = true;
        match.add(id);
      }
    }

    if (parentKeyHit) match.add(id);
    if (hit) visible.add(id);
    return hit;
  }
  walk(value, "", false);
  return { visible, match };
}

type LineCtx = {
  n: number;
  collapsed: Set<string>;
  toggle: (id: string) => void;
  visibility: Visibility;
  onCopyPath: (path: string) => void;
};

function Row({
  line,
  indent,
  isMatch,
  children,
  toggle,
  onToggle,
}: {
  line: number;
  indent: number;
  isMatch?: boolean;
  children: React.ReactNode;
  toggle?: { id: string; open: boolean };
  onToggle?: (id: string) => void;
}) {
  return (
    <div className={`jt-line${toggle ? " jt-line-opener" : ""}${isMatch ? " jt-line-match" : ""}`}>
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

function KeyLabel({ path, name, onCopyPath }: { path: string; name: string; onCopyPath: (p: string) => void }) {
  return (
    <span
      className="tree-key tree-key-click"
      role="button"
      tabIndex={0}
      title={formatJsonPath(path)}
      onClick={(e) => {
        e.stopPropagation();
        onCopyPath(path);
      }}
    >
      &quot;{name}&quot;
    </span>
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
  const id = path || "$";
  const vis = ctx.visibility;
  if (vis && !vis.visible.has(id)) return null;

  const isArr = Array.isArray(value);
  const isObj = !isArr && typeof value === "object" && value !== null;
  const isMatch = vis ? vis.match.has(id) : false;

  if (!isArr && !isObj) {
    const ln = ++ctx.n;
    return (
      <Row key={id} line={ln} indent={indent} isMatch={isMatch}>
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
      <Row key={id} line={ln} indent={indent} isMatch={isMatch}>
        {prefix}
        <span className="tree-null">{open + close}</span>
        {suffix}
      </Row>
    );
  }

  const blockId = id;
  const collapsed = ctx.collapsed.has(blockId);
  const openLine = ++ctx.n;

  const visibleCount = vis
    ? entries.filter(([k]) => vis.visible.has(`${blockId}.${k}`)).length
    : entries.length;

  const openRow = (
    <Row
      key={`${blockId}:open`}
      line={openLine}
      indent={indent}
      isMatch={isMatch}
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
    const childPath = `${blockId}.${k}`;
    const childPrefix = isArr ? null : (
      <>
        <KeyLabel path={childPath} name={k} onCopyPath={ctx.onCopyPath} />
        <span className="tree-colon">: </span>
      </>
    );
    return renderNode({
      ctx,
      value: v,
      indent: indent + 1,
      path: childPath,
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
      {vis && visibleCount === 0 ? null : (
        <Row key={`${blockId}:close`} line={closeLine} indent={indent} isMatch={isMatch}>
          <span className="tree-brace">{close}</span>
          {suffix}
        </Row>
      )}
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [paneHide, setPaneHide] = useState<PaneHide>("none");
  const [fullscreen, setFullscreen] = useState(false);
  const [search, setSearch] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toggleBlock = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const gutterRef = useRef<HTMLDivElement>(null);
  const [strOut, setStrOut] = useState<{ src: string; out: string } | null>(null);
  const strOutText = strOut && strOut.src === value ? strOut.out : null;

  const canToString = useMemo(() => {
    try {
      const p = JSON.parse(value.trim());
      return typeof p === "object" && p !== null;
    } catch {
      return false;
    }
  }, [value]);
  const canFromString = useMemo(() => parseStringJson(value) !== undefined, [value]);
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

  const visibility = useMemo(() => (tree === undefined ? null : buildVisibility(tree, search)), [tree, search]);
  const matchCount = visibility ? visibility.match.size : 0;

  const onChange = useCallback(
    (v: string) => {
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
    },
    [t],
  );

  const doFormat = useCallback(() => {
    const v = value.trim();
    if (!v) return;
    try {
      const parsed = JSON.parse(v);
      const out = JSON.stringify(parsed, null, indentStr);
      setValue(out);
      setStatus({ type: "ok", msg: t("json_formatted") });
      setErrDetail(null);
      setTree(parsed);
      setCollapsed(new Set());
    } catch (e) {
      setStatus({ type: "err", msg: t("json_invalid") });
      setErrDetail((e as Error).message);
    }
  }, [value, indentStr, t]);

  const doMinify = useCallback(() => {
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
  }, [value, t]);

  const doSortKeys = () => {
    const v = value.trim();
    if (!v) return;
    try {
      const parsed = JSON.parse(v);
      const sorted = sortKeysDeep(parsed);
      setValue(JSON.stringify(sorted, null, indentStr));
      setStatus({ type: "ok", msg: t("json_sorted") });
      setErrDetail(null);
      setTree(sorted);
      setCollapsed(new Set());
    } catch (e) {
      setStatus({ type: "err", msg: t("json_invalid") });
      setErrDetail((e as Error).message);
    }
  };

  const doToString = () => {
    if (!canToString) return;
    const out = JSON.stringify(JSON.stringify(JSON.parse(value.trim())));
    setStrOut({ src: value, out });
    setStatus({ type: "ok", msg: t("json_stringified") });
    setErrDetail(null);
    setTree(undefined);
  };

  const doFromString = () => {
    const parsed = parseStringJson(value);
    if (parsed === undefined) return;
    setValue(JSON.stringify(parsed, null, indentStr));
    setStatus({ type: "ok", msg: t("json_unstringified") });
    setErrDetail(null);
    setTree(parsed);
  };

  const copyStrOut = () => {
    if (!strOutText) return;
    navigator.clipboard.writeText(strOutText).then(() => toast(t("toast_copied")));
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
    setSearch("");
    setStatus({ type: "idle", msg: t("json_idle") });
    setErrDetail(null);
    setTree(undefined);
    setStrOut(null);
  };

  const doSample = () => onChange(SAMPLE);

  const doPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text);
    } catch {
      toast(t("toast_no_data"));
    }
  };

  const doUploadClick = () => fileInputRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onChange(text);
    e.target.value = "";
  };

  const doDownload = () => {
    const payload = strOutText ?? value;
    if (!payload) return;
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatbox-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    if (tree === undefined) return;
    setCollapsed(new Set(collectBlockIds(tree)));
  };

  const onCopyPath = useCallback(
    (path: string) => {
      const jp = formatJsonPath(path);
      navigator.clipboard.writeText(jp).then(() => toast(`${t("json_path_copied")}: ${jp}`));
    },
    [toast, t],
  );

  // When searching, auto-expand matched branches so results are visible.
  useEffect(() => {
    if (!visibility || tree === undefined) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      let changed = false;
      visibility.visible.forEach((id) => {
        if (next.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [visibility, tree]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        doFormat();
      } else if (mod && e.shiftKey && (e.key === "M" || e.key === "m")) {
        e.preventDefault();
        doMinify();
      } else if (mod && e.key === "f" && tree !== undefined) {
        // Only hijack when tree is visible, so we don't block browser find in textarea.
        if (document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          searchRef.current?.focus();
        }
      } else if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else if (search) setSearch("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doFormat, doMinify, fullscreen, search, tree]);

  // Drag & drop handlers for the input pane
  const onDragOver = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.items).some((it) => it.kind === "file")) {
      e.preventDefault();
      setDragOver(true);
    }
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const text = await file.text();
    onChange(text);
  };

  const inputHidden = paneHide === "input";
  const outputHidden = paneHide === "output";

  return (
    <div className={`tool-card${fullscreen ? " jt-fs" : ""}`}>
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
            <Button
              size="sm"
              variant="subtle"
              onClick={doSortKeys}
              leftIcon={<IconSortAZ size={14} stroke={1.8} />}
            >
              {t("json_sort_keys")}
            </Button>
            <span className="jt-toolbar-sep" aria-hidden />
            <Button size="sm" variant="subtle" onClick={doToString} disabled={!canToString}>
              {t("act_json_to_string")}
            </Button>
            <Button size="sm" variant="subtle" onClick={doFromString} disabled={!canFromString}>
              {t("act_string_to_json")}
            </Button>
          </div>

          <div className="jt-toolbar-right">
            <div className="jt-indent-pack" title={t("json_indent")}>
              <span className="jt-indent-label">{t("json_indent")}</span>
              {(["2", "4", "tab"] as Indent[]).map((i) => (
                <button
                  key={i}
                  className={`indent-btn${indent === i ? " active" : ""}`}
                  onClick={() => setIndent(i)}
                >
                  {i === "tab" ? t("json_tab") : i}
                </button>
              ))}
            </div>
            <div className="jt-kbd-wrap">
              <button
                className="jt-icon-btn"
                onClick={() => setShowShortcuts((v) => !v)}
                onBlur={() => setShowShortcuts(false)}
                title={t("json_shortcut_hint")}
              >
                <IconKeyboard size={15} stroke={1.8} />
              </button>
              {showShortcuts && <div className="jt-kbd-pop">{t("json_shortcut_hint")}</div>}
            </div>
            <button
              className="jt-icon-btn"
              onClick={() => setFullscreen((v) => !v)}
              title={fullscreen ? t("json_exit_fullscreen") : t("json_fullscreen")}
            >
              {fullscreen ? (
                <IconArrowsDiagonalMinimize2 size={15} stroke={1.8} />
              ) : (
                <IconArrowsDiagonal size={15} stroke={1.8} />
              )}
            </button>
            <div className={`jt-status ${status.type}`}>
              {status.type === "ok" && <IconCheck size={12} stroke={2.5} />}
              {status.type === "err" && <IconX size={12} stroke={2.5} />}
              {status.msg}
            </div>
          </div>
        </div>

        {/* ── Error strip ── */}
        {errDetail && <div className="jt-err">{errDetail}</div>}

        {/* ── Split pane ── */}
        <div className="jt-split">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,application/json,text/plain"
            style={{ display: "none" }}
            onChange={onFileChange}
          />

          {/* Input */}
          {inputHidden ? (
            <button className="jt-pane-collapsed" onClick={() => setPaneHide("none")} title={t("json_show_pane")}>
              <IconLayoutSidebarLeftExpand size={16} stroke={1.8} />
              <span className="jt-pane-collapsed-label">{t("json_input")}</span>
            </button>
          ) : (
            <div
              className={`jt-pane jt-editor${outputHidden ? " jt-pane-full" : ""}${dragOver ? " jt-drag" : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <div className="jt-pane-head">
                <div className="jt-pane-title">
                  <span className="jt-pane-dot jt-pane-dot-in" />
                  {t("json_input")}
                  <span className="jt-pane-count">
                    {lineCount} {t("json_lines")}
                  </span>
                </div>
                <div className="jt-pane-tools">
                  <button className="jt-icon-btn" onClick={doUploadClick} title={t("json_upload")}>
                    <IconUpload size={14} stroke={1.8} />
                  </button>
                  <button className="jt-icon-btn" onClick={doPaste} title={t("json_paste")}>
                    <IconClipboard size={14} stroke={1.8} />
                  </button>
                  <button className="jt-icon-btn" onClick={doSample} title={t("json_sample")}>
                    <IconSparkles size={14} stroke={1.8} />
                  </button>
                  <button className="jt-icon-btn" onClick={doCopy} title={t("act_copy")}>
                    <IconCopy size={14} stroke={1.8} />
                  </button>
                  <button className="jt-icon-btn" onClick={doClear} title={t("act_clear")}>
                    <IconEraser size={14} stroke={1.8} />
                  </button>
                  <button
                    className="jt-icon-btn jt-icon-btn-sep"
                    onClick={() => setPaneHide("input")}
                    title={t("json_hide_pane")}
                  >
                    <IconChevronLeft size={14} stroke={1.8} />
                  </button>
                </div>
              </div>
              <div className="jt-editor-body">
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
              {dragOver && (
                <div className="jt-drop-overlay">
                  <IconUpload size={28} stroke={1.6} />
                  <span>{t("json_drop_hint")}</span>
                </div>
              )}
            </div>
          )}

          {!inputHidden && !outputHidden && <div className="jt-divider" />}

          {/* Output */}
          {outputHidden ? (
            <button className="jt-pane-collapsed" onClick={() => setPaneHide("none")} title={t("json_show_pane")}>
              <IconLayoutSidebarRightExpand size={16} stroke={1.8} />
              <span className="jt-pane-collapsed-label">{t("json_output")}</span>
            </button>
          ) : (
            <div className={`jt-pane jt-out-pane${inputHidden ? " jt-pane-full" : ""}`}>
              <div className="jt-pane-head">
                <div className="jt-pane-title">
                  <span className="jt-pane-dot jt-pane-dot-out" />
                  {t("json_output")}
                  {info && <span className="jt-pane-count">{info.size}</span>}
                </div>
                <div className="jt-pane-tools">
                  {tree !== undefined && (
                    <div className="jt-search">
                      <IconSearch size={13} stroke={1.8} />
                      <Input
                        ref={searchRef}
                        inputSize="sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("json_search_placeholder")}
                        className="jt-search-input"
                      />
                      {search && (
                        <>
                          <span className="jt-search-count">
                            {matchCount} {t("json_matches")}
                          </span>
                          <button className="jt-icon-btn" onClick={() => setSearch("")} title={t("act_clear")}>
                            <IconX size={13} stroke={1.8} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {tree !== undefined && (
                    <>
                      <button className="jt-icon-btn" onClick={expandAll} title={t("json_expand_all")}>
                        <IconFoldDown size={14} stroke={1.8} />
                      </button>
                      <button className="jt-icon-btn" onClick={collapseAll} title={t("json_collapse_all")}>
                        <IconFoldUp size={14} stroke={1.8} />
                      </button>
                    </>
                  )}
                  {(value || strOutText) && (
                    <button className="jt-icon-btn" onClick={doDownload} title={t("json_download")}>
                      <IconDownload size={14} stroke={1.8} />
                    </button>
                  )}
                  <button
                    className="jt-icon-btn jt-icon-btn-sep"
                    onClick={() => setPaneHide("output")}
                    title={t("json_hide_pane")}
                  >
                    <IconChevronRight size={14} stroke={1.8} />
                  </button>
                </div>
              </div>
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
                  {tree !== undefined && (
                    <span className="jt-badge jt-badge-hint">
                      <IconLink size={11} stroke={1.8} />
                      {t("json_copy_path")}
                    </span>
                  )}
                </div>
              )}

              {strOutText ? (
                <div className="jt-str-out">
                  <div className="jt-str-head">
                    <span>{t("act_json_to_string")}</span>
                    <Button
                      size="sm"
                      variant="subtle"
                      onClick={copyStrOut}
                      leftIcon={<IconCopy size={14} stroke={1.8} />}
                    >
                      {t("act_copy")}
                    </Button>
                  </div>
                  <pre className="jt-str-pre">{strOutText}</pre>
                </div>
              ) : tree !== undefined ? (
                <div className="jt-tree-wrap">
                  <div className="jt-tree">
                    {search && matchCount === 0 ? (
                      <div className="jt-empty">{t("json_no_matches")}</div>
                    ) : (
                      renderNode({
                        ctx: {
                          n: 0,
                          collapsed,
                          toggle: toggleBlock,
                          visibility,
                          onCopyPath,
                        },
                        value: tree,
                        indent: 0,
                        path: "",
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="jt-empty">{t("json_empty")}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
