"use client";
import { Badge, Button, IconButton, Input, Kbd, Menu, Textarea, Tooltip } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowsSort,
  IconChartBar,
  IconChevronDown,
  IconChevronRight,
  IconClipboard,
  IconClock,
  IconCopy,
  IconDownload,
  IconFileUpload,
  IconFilter,
  IconGitBranch,
  IconKeyboard,
  IconLayoutDashboard,
  IconListDetails,
  IconMaximize,
  IconMinimize,
  IconPlayerPlay,
  IconReload,
  IconSearch,
  IconSitemap,
  IconUser,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LogEntry = {
  workflowinstanceid: string;
  nodeinstancelogid: string;
  nodeinstanceid: string;
  nodeinstancestatus: string;
  useraction: string;
  assigneduser: string | null;
  createddate: string;
  createduser: string;
};

type NodeGroup = {
  id: string;
  entries: LogEntry[];
  status: string;
  firstAt: number;
  lastAt: number;
};

type Workflow = {
  id: string;
  entries: LogEntry[];
  nodes: NodeGroup[];
  startedAt: number;
  endedAt: number;
  totalSpanMs: number;
  assignees: string[];
  users: string[];
  statuses: string[];
  status: string;
};

type LayoutMode = "flow" | "compact" | "classic";

const SAMPLE_JSON = `{
  "data": [
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l1", "nodeinstanceid": "n1", "nodeinstancestatus": "CREATED", "useraction": "CREATE", "assigneduser": null, "createddate": "2026-10-28T09:00:00.000Z", "createduser": "admin" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l2", "nodeinstanceid": "n1", "nodeinstancestatus": "IN_PROGRESS", "useraction": "Nhận xử lý", "assigneduser": "F00001", "createddate": "2026-10-28T09:05:00.000Z", "createduser": "F00001" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l3", "nodeinstanceid": "n1", "nodeinstancestatus": "COMPLETED", "useraction": "Thực hiện hành động", "assigneduser": "F00001", "createddate": "2026-10-28T09:15:00.000Z", "createduser": "F00001" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l4", "nodeinstanceid": "n2", "nodeinstancestatus": "CREATED", "useraction": "CREATE", "assigneduser": null, "createddate": "2026-10-28T09:15:30.000Z", "createduser": "admin" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l5", "nodeinstanceid": "n2", "nodeinstancestatus": "IN_PROGRESS", "useraction": "Nhận xử lý", "assigneduser": "F00002", "createddate": "2026-10-28T09:16:00.000Z", "createduser": "F00002" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l6", "nodeinstanceid": "n2", "nodeinstancestatus": "COMPLETED", "useraction": "Thực hiện hành động", "assigneduser": "F00002", "createddate": "2026-10-28T09:28:00.000Z", "createduser": "F00002" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l7", "nodeinstanceid": "n3", "nodeinstancestatus": "CREATED", "useraction": "CREATE", "assigneduser": null, "createddate": "2026-10-28T09:28:30.000Z", "createduser": "admin" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l8", "nodeinstanceid": "n3", "nodeinstancestatus": "COMPLETED", "useraction": "Phê duyệt", "assigneduser": "F00003", "createddate": "2026-10-28T09:35:00.000Z", "createduser": "F00003" },
    { "workflowinstanceid": "wf-demo-002", "nodeinstancelogid": "l9", "nodeinstanceid": "n4", "nodeinstancestatus": "CREATED", "useraction": "CREATE", "assigneduser": null, "createddate": "2026-10-28T10:00:00.000Z", "createduser": "admin" },
    { "workflowinstanceid": "wf-demo-002", "nodeinstancelogid": "l10", "nodeinstanceid": "n4", "nodeinstancestatus": "IN_PROGRESS", "useraction": "Nhận xử lý", "assigneduser": "F00001", "createddate": "2026-10-28T10:02:00.000Z", "createduser": "F00001" }
  ]
}`;

const STATUS_TONES: Record<string, "info" | "warning" | "success" | "neutral"> = {
  CREATED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
};

function statusTone(s: string) {
  return STATUS_TONES[s] ?? "neutral";
}

function statusColor(s: string) {
  if (s === "COMPLETED") return "var(--ok, #16a34a)";
  if (s === "IN_PROGRESS") return "var(--warn, #d97706)";
  if (s === "CREATED") return "var(--accent, #2563eb)";
  return "var(--muted, #6b7280)";
}

function shortId(id: string) {
  return id.split("-")[0] ?? id;
}

function initials(name: string) {
  const s = name.trim();
  if (!s) return "?";
  const parts = s.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function userColor(user: string) {
  let h = 0;
  for (let i = 0; i < user.length; i++) h = (h * 31 + user.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 55% 55%)`;
}

function fmtDate(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtTime(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return `${h}h ${rm}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function fmtDelta(ms: number) {
  if (ms === 0) return "—";
  const sign = ms < 0 ? "-" : "+";
  const abs = Math.abs(ms);
  if (abs < 1000) return `${sign}${abs}ms`;
  const s = Math.floor(abs / 1000);
  if (s < 60) return `${sign}${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${sign}${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${sign}${h}h ${m % 60}m`;
}

function parseWorkflows(raw: unknown): Workflow[] {
  const list = (raw as { data?: unknown } | null | undefined)?.data;
  if (!Array.isArray(list)) throw new Error("shape");
  const items = (list as LogEntry[]).filter(
    (e) => e && typeof e.workflowinstanceid === "string" && typeof e.createddate === "string",
  );
  const byWf = new Map<string, LogEntry[]>();
  for (const e of items) {
    const arr = byWf.get(e.workflowinstanceid);
    if (arr) arr.push(e);
    else byWf.set(e.workflowinstanceid, [e]);
  }
  const workflows: Workflow[] = [];
  for (const [id, entries] of byWf) {
    const sorted = [...entries].sort(
      (a, b) => Date.parse(a.createddate) - Date.parse(b.createddate),
    );
    const nodeMap = new Map<string, LogEntry[]>();
    for (const e of sorted) {
      const arr = nodeMap.get(e.nodeinstanceid);
      if (arr) arr.push(e);
      else nodeMap.set(e.nodeinstanceid, [e]);
    }
    const nodes: NodeGroup[] = Array.from(nodeMap.entries()).map(([nid, nes]) => {
      const times = nes.map((e) => Date.parse(e.createddate));
      const last = nes[nes.length - 1];
      return {
        id: nid,
        entries: nes,
        status: last.nodeinstancestatus,
        firstAt: Math.min(...times),
        lastAt: Math.max(...times),
      };
    });
    nodes.sort((a, b) => a.firstAt - b.firstAt);
    const startedAt = Math.min(...sorted.map((e) => Date.parse(e.createddate)));
    const endedAt = Math.max(...sorted.map((e) => Date.parse(e.createddate)));
    const assignees = Array.from(
      new Set(sorted.map((e) => e.assigneduser).filter((v): v is string => !!v)),
    );
    const users = Array.from(new Set(sorted.map((e) => e.createduser)));
    const statuses = Array.from(new Set(sorted.map((e) => e.nodeinstancestatus)));
    const last = sorted[sorted.length - 1];
    workflows.push({
      id,
      entries: sorted,
      nodes,
      startedAt,
      endedAt,
      totalSpanMs: endedAt - startedAt,
      assignees,
      users,
      statuses,
      status: last.nodeinstancestatus,
    });
  }
  workflows.sort((a, b) => b.startedAt - a.startedAt);
  return workflows;
}

function downloadBlob(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function workflowToCSV(w: Workflow) {
  const header = ["time", "nodeinstanceid", "status", "useraction", "assigneduser", "createduser", "logid"];
  const rows = w.entries.map((e) => [
    new Date(e.createddate).toISOString(),
    e.nodeinstanceid,
    e.nodeinstancestatus,
    e.useraction,
    e.assigneduser ?? "",
    e.createduser,
    e.nodeinstancelogid,
  ]);
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

function workflowToMarkdown(w: Workflow) {
  const lines: string[] = [];
  lines.push(`# Workflow \`${w.id}\``);
  lines.push("");
  lines.push(`- **Status:** ${w.status}`);
  lines.push(`- **Started:** ${fmtDate(w.startedAt)}`);
  lines.push(`- **Ended:** ${fmtDate(w.endedAt)}`);
  lines.push(`- **Duration:** ${w.totalSpanMs > 0 ? fmtDuration(w.totalSpanMs) : "instant"}`);
  lines.push(`- **Nodes:** ${w.nodes.length} · **Logs:** ${w.entries.length}`);
  lines.push(`- **Assignees:** ${w.assignees.join(", ") || "—"}`);
  lines.push("");
  lines.push("| Time | Node | Status | Action | By |");
  lines.push("|---|---|---|---|---|");
  for (const e of w.entries) {
    lines.push(`| ${fmtDate(Date.parse(e.createddate))} | ${shortId(e.nodeinstanceid)} | ${e.nodeinstancestatus} | ${e.useraction} | ${e.createduser} |`);
  }
  return lines.join("\n");
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

export default function WorkflowTimelineTool() {
  const { t } = useI18n();
  const [raw, setRaw] = useState<string>("");
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [error, setError] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMode>("flow");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerInputRef = useRef<HTMLInputElement>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1500);
  }, []);

  function loadFromText(text: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError(t("wft_invalid_json"));
      return;
    }
    try {
      const wfs = parseWorkflows(parsed);
      if (!wfs.length) {
        setError(t("wft_empty_data"));
        return;
      }
      setWorkflows(wfs);
      setSelectedId(wfs[0].id);
      setSelectedNodeId(null);
      setSelectedLogId(null);
      setError("");
    } catch {
      setError(t("wft_invalid_shape"));
    }
  }

  function onFile(f: File | null) {
    if (!f) return;
    f.text().then((txt) => {
      setRaw(txt);
      loadFromText(txt);
    });
  }

  function reset() {
    setWorkflows(null);
    setSelectedId(null);
    setSelectedNodeId(null);
    setSelectedLogId(null);
    setRaw("");
    setError("");
    setPickerQuery("");
    setFilterUser(null);
    setFilterStatus(null);
  }

  const allUsers = useMemo(() => {
    if (!workflows) return [];
    const s = new Set<string>();
    for (const w of workflows) for (const u of w.assignees) s.add(u);
    return Array.from(s).sort();
  }, [workflows]);

  const allStatuses = useMemo(() => {
    if (!workflows) return [];
    const s = new Set<string>();
    for (const w of workflows) s.add(w.status);
    return Array.from(s).sort();
  }, [workflows]);

  const filteredWorkflows = useMemo(() => {
    if (!workflows) return [];
    const q = pickerQuery.trim().toLowerCase();
    return workflows.filter((w) => {
      if (q && !w.id.toLowerCase().includes(q)) return false;
      if (filterUser && !w.assignees.includes(filterUser)) return false;
      if (filterStatus && w.status !== filterStatus) return false;
      return true;
    });
  }, [workflows, pickerQuery, filterUser, filterStatus]);

  const selected = useMemo(
    () => (workflows && selectedId ? workflows.find((w) => w.id === selectedId) ?? null : null),
    [workflows, selectedId],
  );

  const selectedIndex = selected ? filteredWorkflows.findIndex((w) => w.id === selected.id) : -1;

  const goNewer = useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedId(filteredWorkflows[selectedIndex - 1].id);
      setSelectedNodeId(null);
      setSelectedLogId(null);
    }
  }, [selectedIndex, filteredWorkflows]);

  const goOlder = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < filteredWorkflows.length - 1) {
      setSelectedId(filteredWorkflows[selectedIndex + 1].id);
      setSelectedNodeId(null);
      setSelectedLogId(null);
    }
  }, [selectedIndex, filteredWorkflows]);

  // close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPicker]);

  useEffect(() => {
    if (showPicker) setTimeout(() => pickerInputRef.current?.focus(), 20);
  }, [showPicker]);

  // keyboard shortcuts
  useEffect(() => {
    if (!workflows) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
      if (e.key === "Escape") {
        setFullscreen(false);
        setShowShortcuts(false);
        setShowPicker(false);
        return;
      }
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        setShowPicker(true);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goNewer();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goOlder();
      } else if (e.key === "?") {
        setShowShortcuts((v) => !v);
      } else if (e.key === "f") {
        setFullscreen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [workflows, goNewer, goOlder]);

  if (!workflows) {
    return (
      <div className="wft-upload-wrap">
        <div className="wft-upload-hero">
          <div className="wft-hero-badge">
            <IconSitemap size={14} />
            <span>Workflow Timeline</span>
          </div>
          <h1>{t("wft_upload_title")}</h1>
          <p>{t("wft_upload_desc")}</p>
        </div>

        <div className="wft-upload-grid">
          <div
            className={`wft-dropzone ${dragOver ? "is-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0] ?? null;
              onFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div className="wft-drop-icon">
              <IconFileUpload size={36} stroke={1.5} />
            </div>
            <div className="wft-drop-title">{t("wft_choose_file")}</div>
            <div className="wft-drop-sub">drag & drop · .json</div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                onFile(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="wft-paste">
            <div className="wft-paste-head">
              <span>{t("wft_or_paste")}</span>
              <button className="wft-link" onClick={() => setRaw(SAMPLE_JSON)}>
                {t("wft_load_sample")}
              </button>
            </div>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={t("wft_paste_ph")}
              rows={10}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: 12,
                minHeight: 220,
              }}
            />
            <div className="wft-paste-actions">
              <Button variant="primary" size="sm" onClick={() => loadFromText(raw)} disabled={!raw.trim()}>
                {t("wft_load_paste")}
              </Button>
              {error && <span className="wft-err">{error}</span>}
            </div>
          </div>
        </div>

        <style jsx>{`
          .wft-upload-wrap {
            padding: 20px;
            border-radius: 16px;
            background:
              radial-gradient(1200px 300px at 10% -10%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 60%),
              radial-gradient(900px 260px at 110% -20%, color-mix(in oklab, var(--ok) 10%, transparent), transparent 60%),
              var(--bg-elev, var(--bg));
            border: 1px solid var(--border);
          }
          .wft-upload-hero { text-align: center; padding: 10px 0 22px; }
          .wft-hero-badge {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 4px 10px; border-radius: 999px;
            font-size: 11px; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase;
            color: var(--accent);
            background: color-mix(in oklab, var(--accent) 10%, transparent);
            border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
          }
          .wft-upload-hero h1 {
            margin: 12px 0 6px;
            font-size: 22px;
            font-weight: 700;
            color: var(--text);
            letter-spacing: -0.01em;
          }
          .wft-upload-hero p {
            margin: 0 auto;
            max-width: 540px;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.55;
          }
          .wft-upload-grid {
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: 16px;
          }
          @media (max-width: 860px) { .wft-upload-grid { grid-template-columns: 1fr; } }
          .wft-dropzone {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 10px; padding: 36px 20px; text-align: center; cursor: pointer;
            border: 2px dashed var(--border); border-radius: 14px;
            background: var(--bg);
            transition: all .15s ease;
            min-height: 260px;
          }
          .wft-dropzone:hover, .wft-dropzone.is-over {
            border-color: var(--accent);
            background: color-mix(in oklab, var(--accent) 6%, var(--bg));
            transform: translateY(-1px);
          }
          .wft-drop-icon {
            width: 56px; height: 56px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            background: color-mix(in oklab, var(--accent) 12%, var(--bg));
            color: var(--accent);
            margin-bottom: 4px;
          }
          .wft-drop-title { font-size: 14px; font-weight: 600; color: var(--text); }
          .wft-drop-sub { font-size: 11px; color: var(--muted); letter-spacing: 0.3px; text-transform: uppercase; }
          .wft-paste { display: flex; flex-direction: column; gap: 8px; padding: 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 14px; }
          .wft-paste-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
          .wft-paste-actions { display: flex; align-items: center; gap: 10px; }
          .wft-err { color: var(--err); font-size: 12px; }
          .wft-link {
            background: none; border: none; cursor: pointer; font: inherit;
            color: var(--accent); font-size: 11px; font-weight: 600;
            text-transform: uppercase; letter-spacing: .4px;
          }
          .wft-link:hover { text-decoration: underline; }
        `}</style>
      </div>
    );
  }

  if (!selected) return null;

  const selectedNode = selectedNodeId ? selected.nodes.find((n) => n.id === selectedNodeId) ?? null : null;

  const exportItems = [
    {
      label: t("wft_copy_json"),
      icon: <IconClipboard size={14} />,
      onClick: async () => {
        const ok = await copyText(JSON.stringify({ data: selected.entries }, null, 2));
        flash(ok ? t("wft_copied") : "Error");
      },
    },
    {
      label: t("wft_copy_markdown"),
      icon: <IconClipboard size={14} />,
      onClick: async () => {
        const ok = await copyText(workflowToMarkdown(selected));
        flash(ok ? t("wft_copied") : "Error");
      },
    },
    { separator: true, label: "" },
    {
      label: t("wft_download_csv"),
      icon: <IconDownload size={14} />,
      onClick: () => downloadBlob(`${shortId(selected.id)}-logs.csv`, workflowToCSV(selected), "text/csv"),
    },
  ];

  const layoutItems = [
    { label: t("wft_layout_vertical"), icon: <IconArrowDown size={14} />, onClick: () => setLayout("flow") },
    { label: t("wft_layout_compact"), icon: <IconLayoutDashboard size={14} />, onClick: () => setLayout("compact") },
    { label: t("wft_layout_classic"), icon: <IconArrowsSort size={14} />, onClick: () => setLayout("classic") },
  ];

  return (
    <div className={`wft2 ${fullscreen ? "is-full" : ""}`}>
      {/* TOP COMMAND BAR -------------------------------------------- */}
      <div className="wft2-cmd">
        <div className="wft2-cmd-left">
          <div className="wft2-brand" style={{ ["--brand-color" as string]: statusColor(selected.status) }}>
            <IconGitBranch size={16} />
          </div>
          <div className="wft2-picker" ref={pickerRef}>
            <button
              className={`wft2-picker-btn ${showPicker ? "is-open" : ""}`}
              onClick={() => setShowPicker((v) => !v)}
            >
              <div className="wft2-picker-main">
                <span className="wft2-picker-id">{selected.id}</span>
                <span className="wft2-picker-sub">
                  {selectedIndex + 1}/{filteredWorkflows.length} · {t("wft_pick_workflow")}
                </span>
              </div>
              <IconChevronDown size={14} />
            </button>
            {showPicker && (
              <div className="wft2-picker-drop">
                <div className="wft2-picker-search">
                  <IconSearch size={14} />
                  <Input
                    ref={pickerInputRef}
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder={t("wft_search_ph")}
                  />
                </div>
                <div className="wft2-picker-list">
                  {filteredWorkflows.length === 0 && (
                    <div className="wft2-picker-empty">{t("wft_no_results")}</div>
                  )}
                  {filteredWorkflows.map((w) => (
                    <button
                      key={w.id}
                      className={`wft2-picker-item ${w.id === selectedId ? "is-active" : ""}`}
                      onClick={() => {
                        setSelectedId(w.id);
                        setSelectedNodeId(null);
                        setSelectedLogId(null);
                        setShowPicker(false);
                      }}
                    >
                      <span
                        className="wft2-picker-dot"
                        style={{ background: statusColor(w.status) }}
                      />
                      <div className="wft2-picker-item-main">
                        <span className="wft2-picker-item-id">{w.id}</span>
                        <span className="wft2-picker-item-meta">
                          {fmtDate(w.startedAt)} · {w.nodes.length} nodes ·{" "}
                          {w.totalSpanMs > 0 ? fmtDuration(w.totalSpanMs) : "instant"}
                        </span>
                      </div>
                      <Badge tone={statusTone(w.status)} size="sm" variant="soft">
                        {w.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="wft2-nav">
            <Tooltip content={t("wft_newer")}>
              <IconButton size="sm" variant="ghost" aria-label="newer" onClick={goNewer} disabled={selectedIndex <= 0}>
                <IconArrowLeft size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip content={t("wft_older")}>
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="older"
                onClick={goOlder}
                disabled={selectedIndex < 0 || selectedIndex >= filteredWorkflows.length - 1}
              >
                <IconArrowRight size={15} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className="wft2-cmd-right">
          <div className="wft2-pills">
            <Badge tone={statusTone(selected.status)} variant="soft">
              {selected.status}
            </Badge>
            <span className="wft2-pill">
              <IconClock size={11} />
              {selected.totalSpanMs > 0 ? fmtDuration(selected.totalSpanMs) : t("wft_instant")}
            </span>
            <span className="wft2-pill">
              <IconSitemap size={11} />
              {selected.nodes.length}
            </span>
            <span className="wft2-pill">
              <IconListDetails size={11} />
              {selected.entries.length}
            </span>
            <span className="wft2-pill">
              <IconUsersGroup size={11} />
              {selected.users.length}
            </span>
          </div>
          <div className="wft2-actions">
            <Tooltip content={t("wft_show_filters")}>
              <IconButton
                size="sm"
                variant={showFilters ? "subtle" : "ghost"}
                aria-label="filters"
                onClick={() => setShowFilters((v) => !v)}
              >
                <IconFilter size={14} />
              </IconButton>
            </Tooltip>
            <Menu
              align="end"
              trigger={
                <IconButton size="sm" variant="ghost" aria-label="layout">
                  <IconLayoutDashboard size={14} />
                </IconButton>
              }
              items={layoutItems}
            />
            <Menu
              align="end"
              trigger={
                <Button size="sm" variant="subtle" leftIcon={<IconDownload size={14} />}>
                  {t("wft_export")}
                </Button>
              }
              items={exportItems}
            />
            <Tooltip content={fullscreen ? t("wft_exit_fullscreen") : t("wft_fullscreen")}>
              <IconButton size="sm" variant="ghost" aria-label="fullscreen" onClick={() => setFullscreen((v) => !v)}>
                {fullscreen ? <IconMinimize size={14} /> : <IconMaximize size={14} />}
              </IconButton>
            </Tooltip>
            <Tooltip content={t("wft_shortcuts")}>
              <IconButton size="sm" variant="ghost" aria-label="keyboard" onClick={() => setShowShortcuts((v) => !v)}>
                <IconKeyboard size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip content={t("wft_reset")}>
              <IconButton size="sm" variant="ghost" aria-label="reset" onClick={reset}>
                <IconReload size={14} />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="wft2-filterbar">
          {allStatuses.length > 0 && (
            <div className="wft2-fgroup">
              <span className="wft2-flabel">{t("wft_filter_status")}:</span>
              <div className="wft2-fchips">
                <button
                  className={`wft2-fchip ${!filterStatus ? "is-on" : ""}`}
                  onClick={() => setFilterStatus(null)}
                >
                  {t("wft_filter_all")}
                </button>
                {allStatuses.map((s) => (
                  <button
                    key={s}
                    className={`wft2-fchip ${filterStatus === s ? "is-on" : ""}`}
                    onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                    style={{ ["--chip-color" as string]: statusColor(s) }}
                  >
                    <span className="wft2-fchip-dot" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {allUsers.length > 0 && (
            <div className="wft2-fgroup">
              <span className="wft2-flabel">{t("wft_filter_user")}:</span>
              <div className="wft2-fchips">
                <button
                  className={`wft2-fchip ${!filterUser ? "is-on" : ""}`}
                  onClick={() => setFilterUser(null)}
                >
                  {t("wft_filter_all")}
                </button>
                {allUsers.map((u) => (
                  <button
                    key={u}
                    className={`wft2-fchip ${filterUser === u ? "is-on" : ""}`}
                    onClick={() => setFilterUser(filterUser === u ? null : u)}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAIN CANVAS: FlowChart + Inspector --------------------------- */}
      <div className="wft2-canvas">
        <div className="wft2-canvas-left">
          {layout === "flow" && (
            <FlowChart
              workflow={selected}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          )}
          {layout === "compact" && (
            <CompactView
              workflow={selected}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          )}
          {layout === "classic" && (
            <ClassicGantt workflow={selected} onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
          )}
        </div>

        <aside className="wft2-canvas-right">
          <Inspector
            workflow={selected}
            node={selectedNode}
            selectedLogId={selectedLogId}
            onSelectLog={setSelectedLogId}
            onCopyWfId={async () => {
              const ok = await copyText(selected.id);
              flash(ok ? t("wft_copied") : "Error");
            }}
          />
        </aside>
      </div>

      {/* BOTTOM TIME SCRUBBER ---------------------------------------- */}
      <TimeScrubber
        workflow={selected}
        selectedLogId={selectedLogId}
        onSelectLog={(logId) => {
          setSelectedLogId(logId);
          const e = selected.entries.find((x) => x.nodeinstancelogid === logId);
          if (e) setSelectedNodeId(e.nodeinstanceid);
        }}
      />

      {toast && (
        <div className="wft2-toast">
          <IconCopy size={14} /> {toast}
        </div>
      )}

      {showShortcuts && (
        <div className="wft2-sc-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="wft2-sc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wft2-sc-head">
              <IconKeyboard size={16} />
              <span>{t("wft_shortcuts")}</span>
              <IconButton size="sm" variant="ghost" aria-label="close" onClick={() => setShowShortcuts(false)}>
                <IconX size={14} />
              </IconButton>
            </div>
            <div className="wft2-sc-list">
              <div className="wft2-sc-row">
                <div><Kbd>←</Kbd> <Kbd>→</Kbd></div>
                <span>{t("wft_sc_nav")}</span>
              </div>
              <div className="wft2-sc-row">
                <Kbd>/</Kbd>
                <span>{t("wft_pick_workflow")}</span>
              </div>
              <div className="wft2-sc-row">
                <Kbd>F</Kbd>
                <span>{t("wft_fullscreen")}</span>
              </div>
              <div className="wft2-sc-row">
                <Kbd>Esc</Kbd>
                <span>{t("wft_exit_fullscreen")}</span>
              </div>
              <div className="wft2-sc-row">
                <Kbd>?</Kbd>
                <span>{t("wft_shortcuts")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .wft2 {
          display: flex; flex-direction: column; gap: 10px;
          min-height: 500px;
        }
        .wft2.is-full {
          position: fixed; inset: 0; z-index: 999;
          background: var(--bg);
          padding: 14px;
          overflow: auto;
        }

        /* ===== TOP COMMAND BAR ===== */
        .wft2-cmd {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 10px 12px;
          border: 1px solid var(--border); border-radius: 14px;
          background:
            linear-gradient(135deg,
              color-mix(in oklab, var(--accent) 7%, transparent) 0%,
              transparent 40%,
              color-mix(in oklab, var(--ok) 6%, transparent) 100%),
            var(--bg-elev, var(--bg));
          flex-wrap: wrap;
        }
        .wft2-cmd-left { display: flex; align-items: center; gap: 10px; flex: 1 1 400px; min-width: 0; }
        .wft2-cmd-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .wft2-brand {
          width: 40px; height: 40px; border-radius: 12px;
          background: color-mix(in oklab, var(--brand-color) 20%, transparent);
          color: var(--brand-color);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--brand-color) 30%, transparent);
        }

        .wft2-picker { position: relative; flex: 1 1 240px; min-width: 0; }
        .wft2-picker-btn {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 7px 12px; border-radius: 10px;
          border: 1px solid var(--border); background: var(--bg);
          cursor: pointer; font-family: inherit; text-align: left;
          transition: all .12s;
        }
        .wft2-picker-btn:hover { border-color: color-mix(in oklab, var(--accent) 35%, var(--border)); }
        .wft2-picker-btn.is-open {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 15%, transparent);
        }
        .wft2-picker-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .wft2-picker-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-weight: 700; font-size: 13px; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .wft2-picker-sub {
          font-size: 10.5px; color: var(--muted); letter-spacing: .3px;
          margin-top: 1px;
        }
        .wft2-picker-drop {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 12px; z-index: 50;
          box-shadow: 0 16px 40px -8px rgba(0,0,0,.2);
          display: flex; flex-direction: column;
          max-height: 420px; overflow: hidden;
          min-width: 320px;
        }
        .wft2-picker-search {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 10px; border-bottom: 1px solid var(--border);
          color: var(--muted);
        }
        .wft2-picker-search :global(input) { border: none; background: transparent; padding-left: 0; height: 32px; }
        .wft2-picker-list { overflow-y: auto; max-height: 360px; padding: 4px; }
        .wft2-picker-empty { padding: 20px; text-align: center; color: var(--muted); font-size: 12px; }
        .wft2-picker-item {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 8px 10px; border-radius: 8px;
          border: 1px solid transparent;
          background: transparent; cursor: pointer; font-family: inherit;
          text-align: left; transition: all .1s;
        }
        .wft2-picker-item:hover { background: color-mix(in oklab, var(--accent) 6%, transparent); }
        .wft2-picker-item.is-active {
          background: color-mix(in oklab, var(--accent) 10%, transparent);
          border-color: color-mix(in oklab, var(--accent) 25%, transparent);
        }
        .wft2-picker-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .wft2-picker-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .wft2-picker-item-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-weight: 600; font-size: 12.5px; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .wft2-picker-item-meta { font-size: 10.5px; color: var(--muted); margin-top: 1px; }

        .wft2-nav { display: flex; gap: 2px; padding: 0 2px; border-left: 1px solid var(--border); margin-left: 2px; padding-left: 8px; }

        .wft2-pills { display: inline-flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .wft2-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: 999px;
          font-size: 11px; font-weight: 600;
          color: var(--text);
          background: color-mix(in oklab, var(--text) 5%, transparent);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .wft2-actions { display: inline-flex; align-items: center; gap: 3px; }

        /* ===== FILTER BAR ===== */
        .wft2-filterbar {
          display: flex; flex-wrap: wrap; gap: 12px;
          padding: 8px 12px; border: 1px solid var(--border); border-radius: 12px;
          background: var(--bg);
          align-items: center;
        }
        .wft2-fgroup { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .wft2-flabel { font-size: 10.5px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
        .wft2-fchips { display: inline-flex; gap: 4px; flex-wrap: wrap; }
        .wft2-fchip {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; padding: 3px 10px; border-radius: 999px;
          border: 1px solid var(--border); background: var(--bg); color: var(--text);
          cursor: pointer; font-family: inherit; transition: all .12s;
        }
        .wft2-fchip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--chip-color, var(--muted)); }
        .wft2-fchip:hover { border-color: color-mix(in oklab, var(--accent) 40%, var(--border)); }
        .wft2-fchip.is-on { background: var(--accent); color: #fff; border-color: var(--accent); }
        .wft2-fchip.is-on .wft2-fchip-dot { background: #fff; }

        /* ===== CANVAS ===== */
        .wft2-canvas {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 10px;
          min-height: 420px;
        }
        @media (max-width: 980px) {
          .wft2-canvas { grid-template-columns: 1fr; }
        }
        .wft2-canvas-left {
          border: 1px solid var(--border); border-radius: 14px;
          background: var(--bg-elev, var(--bg));
          padding: 14px; min-height: 420px;
          overflow: auto;
        }
        .wft2-canvas-right {
          border: 1px solid var(--border); border-radius: 14px;
          background: var(--bg-elev, var(--bg));
          overflow: hidden;
          position: sticky; top: 72px;
          max-height: calc(100vh - 180px);
          display: flex; flex-direction: column;
        }

        /* ===== TOAST / SHORTCUTS ===== */
        .wft2-toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: var(--text); color: var(--bg);
          padding: 8px 14px; border-radius: 999px;
          font-size: 12px; font-weight: 600;
          display: inline-flex; align-items: center; gap: 6px;
          box-shadow: 0 8px 24px -8px rgba(0,0,0,.3);
          z-index: 1000;
        }
        .wft2-sc-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.4);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .wft2-sc-modal {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 14px; padding: 16px; min-width: 320px; max-width: 420px;
          box-shadow: 0 20px 60px -20px rgba(0,0,0,.5);
        }
        .wft2-sc-head {
          display: flex; align-items: center; gap: 8px;
          padding-bottom: 10px; margin-bottom: 10px;
          border-bottom: 1px solid var(--border);
          font-size: 13px; font-weight: 700; color: var(--text);
        }
        .wft2-sc-head :global(button) { margin-left: auto; }
        .wft2-sc-list { display: flex; flex-direction: column; gap: 8px; }
        .wft2-sc-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 2px; font-size: 12.5px; color: var(--muted);
        }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/*  FlowChart (vertical cards with arrows)                             */
/* ================================================================== */

function FlowChart({
  workflow,
  selectedNodeId,
  onSelectNode,
}: {
  workflow: Workflow;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const { t } = useI18n();
  const prevNodeLast = (idx: number) => {
    if (idx === 0) return null;
    return workflow.nodes[idx - 1].lastAt;
  };

  return (
    <div className="wft2-flow">
      {workflow.nodes.map((n, idx) => {
        const color = statusColor(n.status);
        const dur = n.lastAt - n.firstAt;
        const prevLast = prevNodeLast(idx);
        const gap = prevLast !== null ? n.firstAt - prevLast : 0;
        const active = n.id === selectedNodeId;
        const first = n.entries[0];
        const last = n.entries[n.entries.length - 1];
        const assignees = Array.from(
          new Set(n.entries.map((e) => e.createduser)),
        );
        return (
          <div key={n.id} className="wft2-flow-row">
            {idx > 0 && (
              <div className="wft2-flow-link">
                <div className="wft2-flow-arrow">
                  <IconArrowDown size={14} />
                </div>
                {gap > 0 && (
                  <div className="wft2-flow-gap">
                    <IconClock size={11} />
                    {t("wft_waited")} {fmtDuration(gap)}
                  </div>
                )}
              </div>
            )}
            <button
              className={`wft2-nodecard ${active ? "is-active" : ""}`}
              style={{ ["--node-color" as string]: color }}
              onClick={() => onSelectNode(active ? null : n.id)}
            >
              <div className="wft2-nodecard-head">
                <div className="wft2-nodecard-idx">#{idx + 1}</div>
                <div className="wft2-nodecard-id">{shortId(n.id)}</div>
                <Badge tone={statusTone(n.status)} size="sm" variant="soft">
                  {n.status}
                </Badge>
              </div>
              <div className="wft2-nodecard-grid">
                <div className="wft2-nodecard-cell">
                  <div className="wft2-cell-label">{t("wft_took")}</div>
                  <div className="wft2-cell-value">
                    {dur > 0 ? fmtDuration(dur) : t("wft_instant")}
                  </div>
                </div>
                <div className="wft2-nodecard-cell">
                  <div className="wft2-cell-label">{t("wft_log_entries")}</div>
                  <div className="wft2-cell-value">{n.entries.length}</div>
                </div>
                <div className="wft2-nodecard-cell">
                  <div className="wft2-cell-label">{t("wft_log_time")}</div>
                  <div className="wft2-cell-value">{fmtTime(n.firstAt)}</div>
                </div>
              </div>
              <div className="wft2-nodecard-foot">
                <div className="wft2-nodecard-users">
                  {assignees.slice(0, 4).map((u) => (
                    <Tooltip key={u} content={u}>
                      <span
                        className="wft2-avatar"
                        style={{ background: userColor(u) }}
                      >
                        {initials(u)}
                      </span>
                    </Tooltip>
                  ))}
                  {assignees.length > 4 && (
                    <span className="wft2-avatar wft2-avatar-more">+{assignees.length - 4}</span>
                  )}
                </div>
                <div className="wft2-nodecard-trans">
                  <span className="wft2-trans-from">{first.nodeinstancestatus}</span>
                  {last !== first && (
                    <>
                      <IconChevronRight size={11} />
                      <span className="wft2-trans-to" style={{ color }}>
                        {last.nodeinstancestatus}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="wft2-nodecard-progress">
                {n.entries.map((e, ei) => {
                  const total = Math.max(dur, 1);
                  const pct = ((Date.parse(e.createddate) - n.firstAt) / total) * 100;
                  return (
                    <Tooltip
                      key={e.nodeinstancelogid}
                      content={`${e.nodeinstancestatus} · ${e.useraction} · ${fmtTime(Date.parse(e.createddate))}`}
                    >
                      <span
                        className="wft2-progress-dot"
                        style={{
                          left: `${pct}%`,
                          background: statusColor(e.nodeinstancestatus),
                          zIndex: n.entries.length - ei,
                        }}
                      />
                    </Tooltip>
                  );
                })}
                <div className="wft2-progress-track" />
              </div>
            </button>
          </div>
        );
      })}

      <style jsx>{`
        .wft2-flow {
          display: flex; flex-direction: column;
          align-items: center;
          padding: 10px 4px 20px;
          gap: 0;
        }
        .wft2-flow-row {
          display: flex; flex-direction: column; align-items: center;
          width: 100%; max-width: 540px;
        }
        .wft2-flow-link {
          display: flex; flex-direction: column; align-items: center;
          padding: 6px 0;
        }
        .wft2-flow-arrow {
          color: color-mix(in oklab, var(--muted) 60%, transparent);
          display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px;
        }
        .wft2-flow-gap {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10.5px; color: var(--muted); font-weight: 600;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          padding: 2px 8px; border-radius: 999px;
          background: color-mix(in oklab, var(--muted) 10%, transparent);
          margin-top: 2px;
        }
        .wft2-nodecard {
          position: relative; width: 100%;
          padding: 12px 14px 14px;
          border-radius: 14px;
          background: var(--bg);
          border: 1.5px solid var(--border);
          text-align: left; font-family: inherit; cursor: pointer;
          display: flex; flex-direction: column; gap: 10px;
          overflow: hidden;
          transition: all .14s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }
        .wft2-nodecard::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 3px;
          background: var(--node-color);
        }
        .wft2-nodecard:hover {
          border-color: color-mix(in oklab, var(--node-color) 40%, var(--border));
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -10px color-mix(in oklab, var(--node-color) 60%, transparent);
        }
        .wft2-nodecard.is-active {
          border-color: var(--node-color);
          box-shadow:
            0 0 0 3px color-mix(in oklab, var(--node-color) 18%, transparent),
            0 10px 24px -10px color-mix(in oklab, var(--node-color) 50%, transparent);
        }
        .wft2-nodecard-head {
          display: flex; align-items: center; gap: 8px; margin-top: 4px;
        }
        .wft2-nodecard-idx {
          width: 20px; height: 20px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10.5px; font-weight: 700;
          background: color-mix(in oklab, var(--node-color) 15%, transparent);
          color: var(--node-color);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .wft2-nodecard-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-weight: 700; font-size: 14px; color: var(--text);
          flex: 1; min-width: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .wft2-nodecard-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .wft2-nodecard-cell {
          padding: 6px 8px;
          border-radius: 8px;
          background: color-mix(in oklab, var(--text) 3%, transparent);
        }
        .wft2-cell-label {
          font-size: 9.5px; color: var(--muted);
          text-transform: uppercase; letter-spacing: .4px; font-weight: 700;
        }
        .wft2-cell-value {
          font-size: 12.5px; color: var(--text); font-weight: 700;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .wft2-nodecard-foot {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
        }
        .wft2-nodecard-users { display: inline-flex; align-items: center; gap: -4px; }
        .wft2-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: #fff;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          border: 2px solid var(--bg);
          margin-left: -4px;
        }
        .wft2-avatar:first-child { margin-left: 0; }
        .wft2-avatar-more {
          background: color-mix(in oklab, var(--text) 20%, transparent);
          color: var(--text);
        }
        .wft2-nodecard-trans {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; color: var(--muted); font-weight: 700;
          letter-spacing: .3px;
        }
        .wft2-trans-from { opacity: .7; }
        .wft2-trans-to { font-weight: 700; }
        .wft2-nodecard-progress {
          position: relative; height: 14px;
          display: flex; align-items: center;
        }
        .wft2-progress-track {
          position: absolute; left: 0; right: 0; top: 50%;
          height: 2px; margin-top: -1px;
          background: color-mix(in oklab, var(--text) 8%, transparent);
          border-radius: 999px;
        }
        .wft2-progress-dot {
          position: absolute; width: 10px; height: 10px; border-radius: 50%;
          transform: translateX(-50%);
          border: 2px solid var(--bg);
          box-shadow: 0 1px 3px rgba(0,0,0,.1);
        }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/*  CompactView (horizontal node pills)                                */
/* ================================================================== */

function CompactView({
  workflow,
  selectedNodeId,
  onSelectNode,
}: {
  workflow: Workflow;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="wft2-compact">
      <div className="wft2-compact-row">
        {workflow.nodes.map((n, idx) => {
          const color = statusColor(n.status);
          const dur = n.lastAt - n.firstAt;
          const active = n.id === selectedNodeId;
          return (
            <div className="wft2-compact-item" key={n.id}>
              <button
                className={`wft2-compact-pill ${active ? "is-active" : ""}`}
                style={{ ["--node-color" as string]: color }}
                onClick={() => onSelectNode(active ? null : n.id)}
              >
                <span className="wft2-compact-idx">{idx + 1}</span>
                <span className="wft2-compact-id">{shortId(n.id)}</span>
                <span className="wft2-compact-status">{n.status}</span>
                <span className="wft2-compact-dur">{dur > 0 ? fmtDuration(dur) : t("wft_instant")}</span>
              </button>
              {idx < workflow.nodes.length - 1 && (
                <div className="wft2-compact-sep">
                  <IconChevronRight size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="wft2-compact-events">
        <div className="wft2-compact-events-head">
          <IconListDetails size={14} /> <h4>{t("wft_log_entries")}</h4>
        </div>
        <ul>
          {workflow.entries.map((e, i) => {
            const prev = i > 0 ? workflow.entries[i - 1] : null;
            const delta = prev ? Date.parse(e.createddate) - Date.parse(prev.createddate) : 0;
            return (
              <li key={e.nodeinstancelogid}>
                <span className="wft2-ce-time">{fmtTime(Date.parse(e.createddate))}</span>
                <span className="wft2-ce-node">{shortId(e.nodeinstanceid)}</span>
                <Badge tone={statusTone(e.nodeinstancestatus)} size="sm" variant="soft">
                  {e.nodeinstancestatus}
                </Badge>
                <span className="wft2-ce-action">{e.useraction}</span>
                <span className="wft2-ce-by">
                  <span className="wft2-avatar wft2-avatar-sm" style={{ background: userColor(e.createduser) }}>
                    {initials(e.createduser)}
                  </span>
                  {e.createduser}
                </span>
                <span className="wft2-ce-delta">{prev ? fmtDelta(delta) : "—"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <style jsx>{`
        .wft2-compact { display: flex; flex-direction: column; gap: 14px; }
        .wft2-compact-row {
          display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
          padding: 10px 4px;
        }
        .wft2-compact-item { display: inline-flex; align-items: center; }
        .wft2-compact-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: 999px;
          border: 1.5px solid var(--border); background: var(--bg);
          cursor: pointer; font-family: inherit;
          position: relative;
          transition: all .12s;
        }
        .wft2-compact-pill:hover {
          border-color: color-mix(in oklab, var(--node-color) 40%, var(--border));
          transform: translateY(-1px);
        }
        .wft2-compact-pill.is-active {
          border-color: var(--node-color);
          background: color-mix(in oklab, var(--node-color) 8%, var(--bg));
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--node-color) 18%, transparent);
        }
        .wft2-compact-idx {
          width: 20px; height: 20px; border-radius: 50%;
          background: var(--node-color); color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 10.5px; font-weight: 700;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .wft2-compact-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-weight: 700; font-size: 12.5px; color: var(--text);
        }
        .wft2-compact-status {
          font-size: 10px; font-weight: 700; letter-spacing: .3px;
          color: var(--node-color);
        }
        .wft2-compact-dur {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px; color: var(--muted); font-weight: 600;
        }
        .wft2-compact-sep {
          color: color-mix(in oklab, var(--muted) 60%, transparent);
          padding: 0 4px;
        }
        .wft2-compact-events {
          border: 1px solid var(--border); border-radius: 12px;
          background: var(--bg); overflow: hidden;
        }
        .wft2-compact-events-head {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          background: color-mix(in oklab, var(--accent) 3%, transparent);
          color: var(--text);
        }
        .wft2-compact-events-head h4 { margin: 0; font-size: 13px; font-weight: 700; }
        .wft2-compact-events ul {
          list-style: none; margin: 0; padding: 4px 0;
          max-height: 340px; overflow-y: auto;
        }
        .wft2-compact-events ul::-webkit-scrollbar { width: 6px; }
        .wft2-compact-events ul::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        .wft2-compact-events li {
          display: grid;
          grid-template-columns: 80px 80px auto 1fr auto 60px;
          gap: 10px; align-items: center;
          padding: 7px 14px;
          border-bottom: 1px solid color-mix(in oklab, var(--border) 50%, transparent);
          font-size: 11.5px;
        }
        .wft2-compact-events li:last-child { border-bottom: none; }
        .wft2-compact-events li:hover { background: color-mix(in oklab, var(--accent) 5%, transparent); }
        .wft2-ce-time { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
        .wft2-ce-node { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; color: var(--text); }
        .wft2-ce-action { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .wft2-ce-by {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: var(--muted); font-size: 11px;
        }
        .wft2-avatar-sm { width: 18px !important; height: 18px !important; font-size: 8px !important; margin: 0 !important; border: none !important; }
        .wft2-ce-delta { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); text-align: right; font-size: 10.5px; }
        :global(.wft2-avatar) {
          width: 22px; height: 22px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: #fff;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/*  Classic Gantt-like horizontal view                                 */
/* ================================================================== */

function ClassicGantt({
  workflow,
  selectedNodeId,
  onSelectNode,
}: {
  workflow: Workflow;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const { t } = useI18n();
  const span = Math.max(workflow.totalSpanMs, 1);
  return (
    <div className="wft2-classic">
      {workflow.nodes.map((n, idx) => {
        const dur = n.lastAt - n.firstAt;
        const offsetPct = ((n.firstAt - workflow.startedAt) / span) * 100;
        const widthPct = Math.max((dur / span) * 100, 1.5);
        const color = statusColor(n.status);
        const active = n.id === selectedNodeId;
        return (
          <button
            className={`wft2-classic-row ${active ? "is-active" : ""}`}
            key={n.id}
            onClick={() => onSelectNode(active ? null : n.id)}
            style={{ ["--row-color" as string]: color }}
          >
            <div className="wft2-classic-side">
              <span className="wft2-classic-idx">#{idx + 1}</span>
              <span className="wft2-classic-id">{shortId(n.id)}</span>
              <Badge tone={statusTone(n.status)} size="sm" variant="soft">
                {n.status}
              </Badge>
            </div>
            <div className="wft2-classic-track">
              <div
                className="wft2-classic-bar"
                style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
              >
                <span className="wft2-classic-barlabel">
                  {dur > 0 ? fmtDuration(dur) : t("wft_instant")}
                </span>
              </div>
            </div>
          </button>
        );
      })}
      <div className="wft2-classic-axis">
        <span>{fmtTime(workflow.startedAt)}</span>
        <span>{workflow.totalSpanMs > 0 ? fmtDuration(workflow.totalSpanMs) : t("wft_instant")}</span>
        <span>{fmtTime(workflow.endedAt)}</span>
      </div>
      <style jsx>{`
        .wft2-classic { display: flex; flex-direction: column; gap: 0; padding: 4px; }
        .wft2-classic-row {
          display: grid; grid-template-columns: 220px 1fr;
          gap: 10px; align-items: center;
          padding: 8px 10px; margin-bottom: 2px;
          border-radius: 10px; cursor: pointer;
          border: 1px solid transparent;
          background: transparent;
          font-family: inherit; text-align: left;
          transition: all .1s;
        }
        .wft2-classic-row:hover {
          background: color-mix(in oklab, var(--row-color) 6%, transparent);
          border-color: color-mix(in oklab, var(--row-color) 20%, transparent);
        }
        .wft2-classic-row.is-active {
          background: color-mix(in oklab, var(--row-color) 10%, transparent);
          border-color: color-mix(in oklab, var(--row-color) 40%, transparent);
        }
        .wft2-classic-side { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
        .wft2-classic-idx {
          width: 22px; height: 22px; border-radius: 6px;
          background: color-mix(in oklab, var(--row-color) 18%, transparent);
          color: var(--row-color);
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 10.5px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .wft2-classic-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-weight: 700; font-size: 12.5px; color: var(--text);
        }
        .wft2-classic-track {
          position: relative; height: 32px;
          background: color-mix(in oklab, var(--text) 3%, transparent);
          border-radius: 8px;
        }
        .wft2-classic-bar {
          position: absolute; top: 4px; bottom: 4px;
          background: var(--row-color);
          opacity: .85;
          border-radius: 6px;
          min-width: 14px;
          display: flex; align-items: center;
          padding: 0 8px;
          overflow: hidden;
        }
        .wft2-classic-barlabel {
          font-size: 10.5px; font-weight: 700; color: #fff;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          white-space: nowrap;
        }
        .wft2-classic-axis {
          display: flex; justify-content: space-between;
          padding: 8px 12px; margin-top: 6px;
          border-top: 1px solid var(--border);
          font-size: 11px; color: var(--muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/*  Inspector (right pane)                                             */
/* ================================================================== */

function Inspector({
  workflow,
  node,
  selectedLogId,
  onSelectLog,
  onCopyWfId,
}: {
  workflow: Workflow;
  node: NodeGroup | null;
  selectedLogId: string | null;
  onSelectLog: (id: string | null) => void;
  onCopyWfId: () => void;
}) {
  const { t } = useI18n();

  if (!node) {
    const userStats = new Map<string, number>();
    for (const e of workflow.entries) {
      userStats.set(e.createduser, (userStats.get(e.createduser) ?? 0) + 1);
    }
    const total = workflow.entries.length;
    const sortedUsers = Array.from(userStats.entries()).sort((a, b) => b[1] - a[1]);
    const handoffs = (() => {
      let c = 0;
      for (let i = 1; i < workflow.entries.length; i++) {
        if (workflow.entries[i - 1].nodeinstanceid !== workflow.entries[i].nodeinstanceid) c++;
      }
      return c;
    })();
    const bottleneck = workflow.nodes.reduce(
      (acc, cur) => ((cur.lastAt - cur.firstAt) > (acc.lastAt - acc.firstAt) ? cur : acc),
      workflow.nodes[0],
    );

    return (
      <>
        <div className="wft2-insp-head">
          <IconLayoutDashboard size={14} />
          <h3>{t("wft_overview")}</h3>
          <IconButton size="sm" variant="ghost" aria-label="copy id" onClick={onCopyWfId}>
            <IconCopy size={13} />
          </IconButton>
        </div>
        <div className="wft2-insp-body">
          <div className="wft2-insp-meta">
            <div className="wft2-insp-metaid">{workflow.id}</div>
            <div className="wft2-insp-metasub">
              {fmtDate(workflow.startedAt)}
              {workflow.totalSpanMs > 0 && (
                <>
                  {" → "}
                  <span className="wft2-insp-dur">
                    {fmtDuration(workflow.totalSpanMs)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="wft2-insp-kpis">
            <div className="wft2-insp-kpi" style={{ ["--k" as string]: statusColor(bottleneck.status) }}>
              <div className="wft2-insp-kpi-label">{t("wft_bottleneck")}</div>
              <div className="wft2-insp-kpi-value">{shortId(bottleneck.id)}</div>
              <div className="wft2-insp-kpi-sub">
                {bottleneck.lastAt > bottleneck.firstAt
                  ? fmtDuration(bottleneck.lastAt - bottleneck.firstAt)
                  : t("wft_instant")}
              </div>
            </div>
            <div className="wft2-insp-kpi" style={{ ["--k" as string]: "var(--warn)" }}>
              <div className="wft2-insp-kpi-label">{t("wft_handoffs")}</div>
              <div className="wft2-insp-kpi-value">{handoffs}</div>
              <div className="wft2-insp-kpi-sub">{workflow.entries.length} actions</div>
            </div>
          </div>

          <div className="wft2-insp-section">
            <div className="wft2-insp-label">
              <IconUsersGroup size={11} /> {t("wft_user_activity")}
            </div>
            <div className="wft2-insp-bars">
              {sortedUsers.map(([u, c]) => (
                <div className="wft2-insp-bar" key={u}>
                  <div className="wft2-insp-bar-head">
                    <span className="wft2-insp-bar-user">
                      <span className="wft2-avatar wft2-avatar-xs" style={{ background: userColor(u) }}>
                        {initials(u)}
                      </span>
                      {u}
                    </span>
                    <span className="wft2-insp-bar-count">
                      {c} <span className="wft2-insp-bar-pct">({((c / total) * 100).toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="wft2-insp-bar-track">
                    <div
                      className="wft2-insp-bar-fill"
                      style={{ width: `${(c / total) * 100}%`, background: userColor(u) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="wft2-insp-tip">{t("wft_inspector_empty")}</div>
        </div>
        <InspectorStyles />
      </>
    );
  }

  const dur = node.lastAt - node.firstAt;
  const nodeUsers = Array.from(new Set(node.entries.map((e) => e.createduser)));
  const nodeIdx = workflow.nodes.findIndex((n) => n.id === node.id) + 1;
  const color = statusColor(node.status);

  return (
    <>
      <div className="wft2-insp-head" style={{ borderBottom: `2px solid ${color}` }}>
        <span className="wft2-insp-dot" style={{ background: color }} />
        <h3>{t("wft_focus_node")}</h3>
        <span className="wft2-insp-idx">#{nodeIdx}</span>
      </div>
      <div className="wft2-insp-body">
        <div className="wft2-insp-meta">
          <div className="wft2-insp-metaid" style={{ color }}>{shortId(node.id)}</div>
          <div className="wft2-insp-metasub">
            <Badge tone={statusTone(node.status)} size="sm" variant="soft">
              {node.status}
            </Badge>
          </div>
        </div>

        <div className="wft2-insp-kpis">
          <div className="wft2-insp-kpi" style={{ ["--k" as string]: color }}>
            <div className="wft2-insp-kpi-label">{t("wft_took")}</div>
            <div className="wft2-insp-kpi-value">{dur > 0 ? fmtDuration(dur) : t("wft_instant")}</div>
            <div className="wft2-insp-kpi-sub">{fmtTime(node.firstAt)} → {fmtTime(node.lastAt)}</div>
          </div>
          <div className="wft2-insp-kpi" style={{ ["--k" as string]: "var(--accent)" }}>
            <div className="wft2-insp-kpi-label">{t("wft_log_entries")}</div>
            <div className="wft2-insp-kpi-value">{node.entries.length}</div>
            <div className="wft2-insp-kpi-sub">
              {nodeUsers.length} {nodeUsers.length > 1 ? "users" : "user"}
            </div>
          </div>
        </div>

        <div className="wft2-insp-section">
          <div className="wft2-insp-label">
            <IconListDetails size={11} /> {t("wft_events_in_node")}
          </div>
          <ol className="wft2-insp-events">
            {node.entries.map((e, i) => {
              const sel = e.nodeinstancelogid === selectedLogId;
              const prev = i > 0 ? node.entries[i - 1] : null;
              const d = prev ? Date.parse(e.createddate) - Date.parse(prev.createddate) : 0;
              const c = statusColor(e.nodeinstancestatus);
              return (
                <li
                  key={e.nodeinstancelogid}
                  className={`wft2-insp-event ${sel ? "is-sel" : ""}`}
                  onClick={() => onSelectLog(sel ? null : e.nodeinstancelogid)}
                  style={{ ["--ev-color" as string]: c }}
                >
                  <span className="wft2-insp-ev-dot" />
                  <div className="wft2-insp-ev-main">
                    <div className="wft2-insp-ev-top">
                      <Badge tone={statusTone(e.nodeinstancestatus)} size="sm" variant="soft">
                        {e.nodeinstancestatus}
                      </Badge>
                      <span className="wft2-insp-ev-time">{fmtTime(Date.parse(e.createddate))}</span>
                    </div>
                    <div className="wft2-insp-ev-act">{e.useraction}</div>
                    <div className="wft2-insp-ev-foot">
                      <span className="wft2-insp-ev-user">
                        <span className="wft2-avatar wft2-avatar-xs" style={{ background: userColor(e.createduser) }}>
                          {initials(e.createduser)}
                        </span>
                        {e.createduser}
                      </span>
                      {prev && <span className="wft2-insp-ev-delta">{fmtDelta(d)}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <InspectorStyles />
    </>
  );
}

function InspectorStyles() {
  return (
    <style jsx global>{`
      .wft2-insp-head {
        display: flex; align-items: center; gap: 8px;
        padding: 11px 14px;
        border-bottom: 1px solid var(--border);
        background: color-mix(in oklab, var(--accent) 3%, transparent);
        color: var(--text);
      }
      .wft2-insp-head h3 { margin: 0; font-size: 13px; font-weight: 700; }
      .wft2-insp-head :global(button) { margin-left: auto; }
      .wft2-insp-dot { width: 10px; height: 10px; border-radius: 50%; }
      .wft2-insp-idx {
        margin-left: auto; font-size: 11px; font-weight: 700;
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .wft2-insp-body {
        flex: 1; overflow-y: auto;
        padding: 12px 14px;
        display: flex; flex-direction: column; gap: 12px;
      }
      .wft2-insp-body::-webkit-scrollbar { width: 6px; }
      .wft2-insp-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      .wft2-insp-meta { display: flex; flex-direction: column; gap: 4px; }
      .wft2-insp-metaid {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 14px; font-weight: 700; color: var(--text);
        word-break: break-all;
      }
      .wft2-insp-metasub {
        font-size: 11px; color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .wft2-insp-dur { color: var(--accent); font-weight: 700; }

      .wft2-insp-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .wft2-insp-kpi {
        padding: 8px 10px; border-radius: 10px;
        background: color-mix(in oklab, var(--k) 8%, transparent);
        border: 1px solid color-mix(in oklab, var(--k) 20%, transparent);
      }
      .wft2-insp-kpi-label {
        font-size: 9.5px; color: var(--muted);
        text-transform: uppercase; letter-spacing: .4px; font-weight: 700;
      }
      .wft2-insp-kpi-value {
        font-size: 15px; font-weight: 700; color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        margin-top: 2px;
      }
      .wft2-insp-kpi-sub {
        font-size: 10px; color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        margin-top: 1px;
      }

      .wft2-insp-section { display: flex; flex-direction: column; gap: 6px; }
      .wft2-insp-label {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 10px; color: var(--muted);
        text-transform: uppercase; letter-spacing: .5px; font-weight: 700;
      }
      .wft2-insp-bars { display: flex; flex-direction: column; gap: 7px; }
      .wft2-insp-bar { display: flex; flex-direction: column; gap: 3px; }
      .wft2-insp-bar-head {
        display: flex; justify-content: space-between; align-items: center;
        font-size: 11px;
      }
      .wft2-insp-bar-user {
        display: inline-flex; align-items: center; gap: 5px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: var(--text); font-weight: 600;
      }
      .wft2-insp-bar-count {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: var(--text); font-weight: 600;
      }
      .wft2-insp-bar-pct { color: var(--muted); font-weight: 500; }
      .wft2-insp-bar-track {
        height: 6px; border-radius: 999px;
        background: color-mix(in oklab, var(--text) 5%, transparent);
        overflow: hidden;
      }
      .wft2-insp-bar-fill { height: 100%; border-radius: 999px; transition: width .3s ease; }

      .wft2-insp-events { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
      .wft2-insp-event {
        position: relative;
        display: flex; gap: 10px; padding: 8px 2px 8px 14px;
        cursor: pointer;
        border-radius: 8px;
        transition: all .1s;
      }
      .wft2-insp-event::before {
        content: ''; position: absolute;
        left: 4px; top: 14px; bottom: -8px;
        width: 2px; background: var(--border);
      }
      .wft2-insp-event:last-child::before { display: none; }
      .wft2-insp-ev-dot {
        position: absolute; left: 0; top: 10px;
        width: 10px; height: 10px; border-radius: 50%;
        background: var(--ev-color);
        box-shadow: 0 0 0 3px var(--bg);
      }
      .wft2-insp-event.is-sel {
        background: color-mix(in oklab, var(--ev-color) 10%, transparent);
      }
      .wft2-insp-event:hover { background: color-mix(in oklab, var(--ev-color) 7%, transparent); }
      .wft2-insp-ev-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .wft2-insp-ev-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
      .wft2-insp-ev-time {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10.5px; color: var(--muted);
      }
      .wft2-insp-ev-act { font-size: 12px; color: var(--text); font-weight: 500; }
      .wft2-insp-ev-foot {
        display: flex; align-items: center; justify-content: space-between;
        font-size: 10.5px; color: var(--muted);
      }
      .wft2-insp-ev-user {
        display: inline-flex; align-items: center; gap: 5px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .wft2-insp-ev-delta {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-weight: 600;
      }
      .wft2-insp-tip {
        margin-top: 6px; padding: 10px;
        border: 1px dashed var(--border);
        border-radius: 10px;
        font-size: 11.5px; color: var(--muted);
        text-align: center;
      }

      .wft2-avatar-xs {
        width: 16px !important; height: 16px !important;
        font-size: 7.5px !important; margin: 0 !important; border: none !important;
      }
    `}</style>
  );
}

/* ================================================================== */
/*  Bottom time scrubber                                               */
/* ================================================================== */

function TimeScrubber({
  workflow,
  selectedLogId,
  onSelectLog,
}: {
  workflow: Workflow;
  selectedLogId: string | null;
  onSelectLog: (id: string | null) => void;
}) {
  const { t } = useI18n();
  const span = Math.max(workflow.totalSpanMs, 1);
  return (
    <div className="wft2-scrub">
      <div className="wft2-scrub-head">
        <span className="wft2-scrub-l">{fmtDate(workflow.startedAt)}</span>
        <span className="wft2-scrub-tip">{t("wft_scrubber_tip")}</span>
        <span className="wft2-scrub-r">{fmtDate(workflow.endedAt)}</span>
      </div>
      <div className="wft2-scrub-track">
        {workflow.nodes.map((n) => {
          const dur = n.lastAt - n.firstAt;
          const offsetPct = ((n.firstAt - workflow.startedAt) / span) * 100;
          const widthPct = Math.max((dur / span) * 100, 0.6);
          return (
            <div
              key={n.id}
              className="wft2-scrub-noderange"
              style={{
                left: `${offsetPct}%`,
                width: `${widthPct}%`,
                background: `color-mix(in oklab, ${statusColor(n.status)} 25%, transparent)`,
                borderTop: `2px solid ${statusColor(n.status)}`,
              }}
            />
          );
        })}
        {workflow.entries.map((e) => {
          const pct = ((Date.parse(e.createddate) - workflow.startedAt) / span) * 100;
          const sel = e.nodeinstancelogid === selectedLogId;
          return (
            <Tooltip
              key={e.nodeinstancelogid}
              content={`${shortId(e.nodeinstanceid)} · ${e.nodeinstancestatus} · ${fmtTime(Date.parse(e.createddate))}`}
            >
              <button
                className={`wft2-scrub-dot ${sel ? "is-sel" : ""}`}
                style={{
                  left: `${pct}%`,
                  background: statusColor(e.nodeinstancestatus),
                }}
                onClick={() => onSelectLog(sel ? null : e.nodeinstancelogid)}
                aria-label={`${e.nodeinstancestatus} ${fmtTime(Date.parse(e.createddate))}`}
              />
            </Tooltip>
          );
        })}
      </div>
      <style jsx>{`
        .wft2-scrub {
          border: 1px solid var(--border); border-radius: 12px;
          padding: 10px 14px;
          background: var(--bg-elev, var(--bg));
          display: flex; flex-direction: column; gap: 8px;
        }
        .wft2-scrub-head {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 10.5px; color: var(--muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .wft2-scrub-tip {
          font-family: inherit;
          font-size: 10.5px; color: var(--muted);
          font-weight: 500;
          text-align: center; flex: 1;
        }
        .wft2-scrub-l, .wft2-scrub-r { font-weight: 600; color: var(--text); }
        .wft2-scrub-track {
          position: relative; height: 32px;
          background: color-mix(in oklab, var(--text) 3%, transparent);
          border-radius: 8px;
          overflow: visible;
        }
        .wft2-scrub-noderange {
          position: absolute; top: 0; bottom: 0;
          border-radius: 6px;
          min-width: 2px;
        }
        .wft2-scrub-dot {
          position: absolute; top: 50%;
          width: 11px; height: 11px; border-radius: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid var(--bg);
          cursor: pointer; padding: 0;
          transition: all .12s;
          box-shadow: 0 1px 3px rgba(0,0,0,.15);
        }
        .wft2-scrub-dot:hover {
          transform: translate(-50%, -50%) scale(1.3);
          z-index: 2;
        }
        .wft2-scrub-dot.is-sel {
          transform: translate(-50%, -50%) scale(1.5);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 30%, transparent), 0 2px 6px rgba(0,0,0,.2);
          z-index: 3;
        }
      `}</style>
    </div>
  );
}
