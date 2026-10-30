"use client";
import { Badge, Button, Input, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowLeft,
  IconArrowRight,
  IconClock,
  IconFileUpload,
  IconGitBranch,
  IconHistory,
  IconListDetails,
  IconPlayerPlay,
  IconReload,
  IconSearch,
  IconSitemap,
  IconUser,
} from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";

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
  status: string;
};

type Spacing = "equal" | "proportional";

const SAMPLE_JSON = `{
  "data": [
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l1", "nodeinstanceid": "n1", "nodeinstancestatus": "CREATED", "useraction": "CREATE", "assigneduser": null, "createddate": "2026-10-28T09:00:00.000Z", "createduser": "admin" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l2", "nodeinstanceid": "n1", "nodeinstancestatus": "IN_PROGRESS", "useraction": "Nhận xử lý", "assigneduser": "F00001", "createddate": "2026-10-28T09:05:00.000Z", "createduser": "F00001" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l3", "nodeinstanceid": "n1", "nodeinstancestatus": "COMPLETED", "useraction": "Thực hiện hành động", "assigneduser": "F00001", "createddate": "2026-10-28T09:15:00.000Z", "createduser": "F00001" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l4", "nodeinstanceid": "n2", "nodeinstancestatus": "CREATED", "useraction": "CREATE", "assigneduser": null, "createddate": "2026-10-28T09:15:30.000Z", "createduser": "admin" },
    { "workflowinstanceid": "wf-demo-001", "nodeinstancelogid": "l5", "nodeinstanceid": "n2", "nodeinstancestatus": "COMPLETED", "useraction": "Thực hiện hành động", "assigneduser": "F00002", "createddate": "2026-10-28T09:20:00.000Z", "createduser": "F00002" }
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

function fmtDate(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtTime(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}.${String(ms % 1000).padStart(3, "0").slice(0, 1)} s`;
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
  if (abs < 1000) return `${sign}${abs} ms`;
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
    const last = sorted[sorted.length - 1];
    workflows.push({
      id,
      entries: sorted,
      nodes,
      startedAt,
      endedAt,
      totalSpanMs: endedAt - startedAt,
      assignees,
      status: last.nodeinstancestatus,
    });
  }
  workflows.sort((a, b) => b.startedAt - a.startedAt);
  return workflows;
}

export default function WorkflowTimelineTool() {
  const { t } = useI18n();
  const [raw, setRaw] = useState<string>("");
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState("");
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spacing, setSpacing] = useState<Spacing>("equal");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    setRaw("");
    setError("");
    setQuery("");
    setFilterUser(null);
  }

  const allUsers = useMemo(() => {
    if (!workflows) return [];
    const s = new Set<string>();
    for (const w of workflows) for (const u of w.assignees) s.add(u);
    return Array.from(s).sort();
  }, [workflows]);

  const filteredWorkflows = useMemo(() => {
    if (!workflows) return [];
    const q = query.trim().toLowerCase();
    return workflows.filter((w) => {
      if (q && !w.id.toLowerCase().includes(q)) return false;
      if (filterUser && !w.assignees.includes(filterUser)) return false;
      return true;
    });
  }, [workflows, query, filterUser]);

  const selected = useMemo(
    () => (workflows && selectedId ? workflows.find((w) => w.id === selectedId) ?? null : null),
    [workflows, selectedId],
  );

  const selectedIndex = selected ? filteredWorkflows.findIndex((w) => w.id === selected.id) : -1;

  function goNewer() {
    if (selectedIndex > 0) setSelectedId(filteredWorkflows[selectedIndex - 1].id);
  }
  function goOlder() {
    if (selectedIndex >= 0 && selectedIndex < filteredWorkflows.length - 1) {
      setSelectedId(filteredWorkflows[selectedIndex + 1].id);
    }
  }

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

  return (
    <div className="wft">
      <aside className="wft-side">
        <div className="wft-side-head">
          <IconListDetails size={14} />
          <span>Workflows</span>
          <span className="wft-side-count">{filteredWorkflows.length}</span>
        </div>
        <div className="wft-search">
          <IconSearch size={14} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("wft_search_ph")}
          />
        </div>
        {allUsers.length > 0 && (
          <div className="wft-filters">
            <button
              className={`wft-chip ${!filterUser ? "is-on" : ""}`}
              onClick={() => setFilterUser(null)}
            >
              {t("wft_filter_all")}
            </button>
            {allUsers.slice(0, 8).map((u) => (
              <button
                key={u}
                className={`wft-chip ${filterUser === u ? "is-on" : ""}`}
                onClick={() => setFilterUser(filterUser === u ? null : u)}
              >
                {u}
              </button>
            ))}
          </div>
        )}
        <div className="wft-list">
          {filteredWorkflows.map((w) => {
            const assigneeStr = w.assignees.join(" · ") || "—";
            const active = w.id === selectedId;
            return (
              <button
                key={w.id}
                className={`wft-item ${active ? "is-active" : ""}`}
                onClick={() => setSelectedId(w.id)}
                style={{ ["--status-color" as string]: statusColor(w.status) }}
              >
                <span className="wft-item-bar" />
                <div className="wft-item-body">
                  <div className="wft-item-top">
                    <span className="wft-item-id">{shortId(w.id)}</span>
                    <Badge tone={statusTone(w.status)} size="sm" variant="soft">
                      {w.status}
                    </Badge>
                  </div>
                  <div className="wft-item-meta">{fmtDate(w.startedAt)}</div>
                  <div className="wft-item-sub">
                    <span className="wft-item-pill">
                      <IconUser size={10} /> {assigneeStr}
                    </span>
                    <span className="wft-item-pill">
                      <IconSitemap size={10} /> {w.nodes.length} {t("wft_nodes")}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="wft-side-foot">
          <Button size="sm" variant="ghost" leftIcon={<IconReload size={14} />} onClick={reset}>
            {t("wft_reset")}
          </Button>
        </div>
      </aside>

      <section className="wft-main">
        {!selected ? (
          <div className="wft-empty">{t("wft_no_workflow")}</div>
        ) : (
          <>
            <WorkflowHeader
              workflow={selected}
              onNewer={goNewer}
              onOlder={goOlder}
              canNewer={selectedIndex > 0}
              canOlder={selectedIndex >= 0 && selectedIndex < filteredWorkflows.length - 1}
            />
            <WorkflowStats workflow={selected} />
            <TimelineSection workflow={selected} spacing={spacing} onSpacing={setSpacing} />
            <LogEntriesTable workflow={selected} />
          </>
        )}
      </section>

      <style jsx>{`
        .wft {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 980px) {
          .wft { grid-template-columns: 1fr; }
        }
        .wft-side {
          display: flex; flex-direction: column; gap: 10px;
          border: 1px solid var(--border); border-radius: 14px; padding: 12px;
          background:
            linear-gradient(180deg, color-mix(in oklab, var(--accent) 4%, transparent), transparent 40%),
            var(--bg-elev, var(--bg));
          position: sticky; top: 72px;
          max-height: calc(100vh - 88px);
          overflow: hidden;
        }
        .wft-side-head {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
          color: var(--muted);
        }
        .wft-side-count {
          margin-left: auto;
          font-size: 10px;
          padding: 1px 7px;
          border-radius: 999px;
          background: color-mix(in oklab, var(--accent) 12%, transparent);
          color: var(--accent);
        }
        .wft-search {
          display: flex; align-items: center; gap: 6px;
          padding: 0 10px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg);
          color: var(--muted);
        }
        .wft-search :global(input) { border: none; background: transparent; padding-left: 0; height: 34px; }
        .wft-filters { display: flex; flex-wrap: wrap; gap: 4px; }
        .wft-chip {
          font-size: 11px; padding: 3px 10px; border-radius: 999px;
          border: 1px solid var(--border); background: var(--bg); color: var(--text);
          cursor: pointer; font-family: inherit; transition: all .12s;
        }
        .wft-chip:hover { border-color: color-mix(in oklab, var(--accent) 40%, var(--border)); }
        .wft-chip.is-on { background: var(--accent); color: #fff; border-color: var(--accent); }
        .wft-list {
          display: flex; flex-direction: column; gap: 6px;
          overflow-y: auto; min-height: 100px;
          padding-right: 2px;
          margin: 2px -2px 0 0;
        }
        .wft-list::-webkit-scrollbar { width: 6px; }
        .wft-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        .wft-item {
          position: relative;
          text-align: left; padding: 10px 12px 10px 14px; border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          cursor: pointer; display: flex; gap: 10px;
          font-family: inherit; overflow: hidden;
          transition: all .12s ease;
        }
        .wft-item-bar {
          position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
          background: var(--status-color);
          opacity: .55;
        }
        .wft-item-body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .wft-item:hover {
          border-color: color-mix(in oklab, var(--accent) 35%, var(--border));
          transform: translateY(-1px);
        }
        .wft-item.is-active {
          border-color: var(--accent);
          box-shadow: 0 0 0 1px var(--accent) inset, 0 4px 14px -8px color-mix(in oklab, var(--accent) 50%, transparent);
        }
        .wft-item.is-active .wft-item-bar { opacity: 1; }
        .wft-item-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
        .wft-item-id {
          font-weight: 600; font-size: 13px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: var(--text);
        }
        .wft-item-meta { font-size: 11px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .wft-item-sub { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
        .wft-item-pill {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 10px; padding: 2px 6px; border-radius: 6px;
          background: color-mix(in oklab, var(--text) 5%, transparent);
          color: var(--muted);
        }
        .wft-side-foot {
          padding-top: 6px; border-top: 1px solid var(--border);
          display: flex; justify-content: flex-end;
        }
        .wft-main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
        .wft-empty {
          padding: 60px 20px; text-align: center; color: var(--muted);
          border: 1px dashed var(--border); border-radius: 14px;
          background: var(--bg-elev, var(--bg));
        }
      `}</style>
    </div>
  );
}

function WorkflowHeader({
  workflow,
  onNewer,
  onOlder,
  canNewer,
  canOlder,
}: {
  workflow: Workflow;
  onNewer: () => void;
  onOlder: () => void;
  canNewer: boolean;
  canOlder: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="wft-head">
      <div className="wft-head-title">
        <div
          className="wft-head-icon"
          style={{ background: `color-mix(in oklab, ${statusColor(workflow.status)} 15%, transparent)`, color: statusColor(workflow.status) }}
        >
          <IconGitBranch size={18} />
        </div>
        <div>
          <div className="wft-head-label">{t("wft_workflow")}</div>
          <div className="wft-head-row">
            <span className="wft-head-id">{workflow.id}</span>
            <Badge tone={statusTone(workflow.status)} variant="soft">
              {workflow.status}
            </Badge>
          </div>
        </div>
      </div>
      <div className="wft-head-nav">
        <Button
          size="sm"
          variant="subtle"
          leftIcon={<IconArrowLeft size={14} />}
          onClick={onNewer}
          disabled={!canNewer}
        >
          {t("wft_newer")}
        </Button>
        <Button
          size="sm"
          variant="subtle"
          onClick={onOlder}
          disabled={!canOlder}
        >
          {t("wft_older")}
          <IconArrowRight size={14} style={{ marginLeft: 6 }} />
        </Button>
      </div>
      <style jsx>{`
        .wft-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 14px;
          background:
            linear-gradient(180deg, color-mix(in oklab, var(--accent) 5%, transparent), transparent 60%),
            var(--bg-elev, var(--bg));
          flex-wrap: wrap;
        }
        .wft-head-title { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .wft-head-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .wft-head-label {
          font-size: 10px; font-weight: 700; letter-spacing: .5px;
          text-transform: uppercase; color: var(--muted);
        }
        .wft-head-row { display: flex; align-items: center; gap: 10px; margin-top: 2px; flex-wrap: wrap; }
        .wft-head-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 14px; font-weight: 600; color: var(--text);
          word-break: break-all;
        }
        .wft-head-nav { display: flex; gap: 6px; }
      `}</style>
    </div>
  );
}

function WorkflowStats({ workflow }: { workflow: Workflow }) {
  const { t } = useI18n();
  const items = [
    {
      icon: <IconUser size={14} />,
      label: workflow.assignees.length > 1 ? t("wft_assignees") : t("wft_assignee"),
      value: workflow.assignees.join(" · ") || "—",
    },
    { icon: <IconSitemap size={14} />, label: t("wft_node_instances"), value: String(workflow.nodes.length) },
    { icon: <IconListDetails size={14} />, label: t("wft_log_entries"), value: String(workflow.entries.length) },
    { icon: <IconPlayerPlay size={14} />, label: t("wft_started"), value: fmtDate(workflow.startedAt) },
    {
      icon: <IconClock size={14} />,
      label: t("wft_total_span"),
      value: workflow.totalSpanMs > 0 ? fmtDuration(workflow.totalSpanMs) : t("wft_instant"),
    },
  ];
  return (
    <div className="wft-stats">
      {items.map((it, i) => (
        <div className="wft-stat" key={i}>
          <div className="wft-stat-ic">{it.icon}</div>
          <div className="wft-stat-body">
            <div className="wft-stat-label">{it.label}</div>
            <div className="wft-stat-value">{it.value}</div>
          </div>
        </div>
      ))}
      <style jsx>{`
        .wft-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 8px;
        }
        .wft-stat {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 12px;
          background: var(--bg-elev, var(--bg));
          border: 1px solid var(--border);
          transition: all .15s;
        }
        .wft-stat:hover { border-color: color-mix(in oklab, var(--accent) 30%, var(--border)); }
        .wft-stat-ic {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: color-mix(in oklab, var(--accent) 10%, transparent);
          color: var(--accent);
          flex-shrink: 0;
        }
        .wft-stat-body { min-width: 0; }
        .wft-stat-label {
          font-size: 10px; color: var(--muted);
          text-transform: uppercase; letter-spacing: .4px; font-weight: 600;
        }
        .wft-stat-value {
          font-size: 13px; font-weight: 600; color: var(--text);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}

function TimelineSection({
  workflow,
  spacing,
  onSpacing,
}: {
  workflow: Workflow;
  spacing: Spacing;
  onSpacing: (s: Spacing) => void;
}) {
  const { t } = useI18n();

  const sortedTimes = useMemo(
    () => Array.from(new Set(workflow.entries.map((e) => Date.parse(e.createddate)))).sort((a, b) => a - b),
    [workflow],
  );

  const indexOf = useMemo(() => {
    const m = new Map<number, number>();
    sortedTimes.forEach((t, i) => m.set(t, i));
    return m;
  }, [sortedTimes]);

  const padL = 180;
  const padR = 48;
  const topPad = 56;
  const bottomPad = 32;
  const rowH = 76;
  const width = 1000;
  const height = topPad + workflow.nodes.length * rowH + bottomPad;

  function xFor(ms: number) {
    const usable = width - padL - padR;
    if (spacing === "equal") {
      if (sortedTimes.length <= 1) return padL + usable / 2;
      const i = indexOf.get(ms) ?? 0;
      return padL + (i / (sortedTimes.length - 1)) * usable;
    }
    if (workflow.totalSpanMs === 0) return padL + usable / 2;
    const pct = (ms - workflow.startedAt) / workflow.totalSpanMs;
    return padL + pct * usable;
  }

  const timeTicks = useMemo(() => {
    if (sortedTimes.length <= 5) return sortedTimes;
    const ticks: number[] = [];
    const step = Math.max(1, Math.floor(sortedTimes.length / 4));
    for (let i = 0; i < sortedTimes.length; i += step) ticks.push(sortedTimes[i]);
    if (ticks[ticks.length - 1] !== sortedTimes[sortedTimes.length - 1]) {
      ticks.push(sortedTimes[sortedTimes.length - 1]);
    }
    return ticks;
  }, [sortedTimes]);

  const handoffs = useMemo(() => {
    const arr: { fromT: number; toT: number; fromRow: number; toRow: number }[] = [];
    for (let i = 1; i < workflow.entries.length; i++) {
      const prev = workflow.entries[i - 1];
      const cur = workflow.entries[i];
      if (prev.nodeinstanceid !== cur.nodeinstanceid) {
        const fromRow = workflow.nodes.findIndex((n) => n.id === prev.nodeinstanceid);
        const toRow = workflow.nodes.findIndex((n) => n.id === cur.nodeinstanceid);
        if (fromRow >= 0 && toRow >= 0) {
          arr.push({
            fromT: Date.parse(prev.createddate),
            toT: Date.parse(cur.createddate),
            fromRow,
            toRow,
          });
        }
      }
    }
    return arr;
  }, [workflow]);

  return (
    <div className="wft-timeline-card">
      <div className="wft-tl-head">
        <div className="wft-tl-title">
          <IconHistory size={16} />
          <h3>{t("wft_timeline")}</h3>
        </div>
        <div className="wft-tl-spacing">
          <span>{t("wft_spacing")}</span>
          <div className="wft-seg">
            <button className={spacing === "equal" ? "is-on" : ""} onClick={() => onSpacing("equal")}>
              {t("wft_equal_steps")}
            </button>
            <button
              className={spacing === "proportional" ? "is-on" : ""}
              onClick={() => onSpacing("proportional")}
            >
              {t("wft_proportional_time")}
            </button>
          </div>
        </div>
      </div>
      <div className="wft-tl-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="wft-tl-svg">
          <defs>
            <marker
              id="wft-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>

          {workflow.nodes.map((_, rowIdx) =>
            rowIdx % 2 === 0 ? (
              <rect
                key={`band-${rowIdx}`}
                x="0"
                y={topPad + rowIdx * rowH}
                width={width}
                height={rowH}
                fill="color-mix(in oklab, var(--text) 2%, transparent)"
              />
            ) : null,
          )}

          {timeTicks.map((tm, i) => {
            const x = xFor(tm);
            const prev = i > 0 ? timeTicks[i - 1] : null;
            const delta = prev ? tm - prev : 0;
            return (
              <g key={tm}>
                <line
                  x1={x}
                  y1={topPad - 8}
                  x2={x}
                  y2={height - bottomPad + 4}
                  stroke="var(--border)"
                  strokeDasharray="2 4"
                  opacity="0.6"
                />
                <text x={x} y={topPad - 20} textAnchor="middle" fontSize="10" fill="var(--muted)" fontWeight="600">
                  {fmtTime(tm)}
                </text>
                {prev && (
                  <text
                    x={(x + xFor(prev)) / 2}
                    y={topPad - 6}
                    textAnchor="middle"
                    fontSize="9"
                    fill="var(--muted)"
                    opacity="0.8"
                  >
                    +{fmtDuration(delta)}
                  </text>
                )}
              </g>
            );
          })}

          {workflow.nodes.map((n, rowIdx) => {
            const y = topPad + rowIdx * rowH + rowH / 2;
            const first = n.entries[0];
            const last = n.entries[n.entries.length - 1];
            const x1 = xFor(Date.parse(first.createddate));
            const x2 = xFor(Date.parse(last.createddate));
            const color = statusColor(n.status);
            return (
              <g key={n.id}>
                <rect
                  x="12"
                  y={y - 24}
                  width="150"
                  height="48"
                  rx="10"
                  fill="var(--bg)"
                  stroke="var(--border)"
                />
                <circle cx="26" cy={y} r="4" fill={color} />
                <text x="38" y={y - 6} fontSize="12" fill="var(--text)" fontWeight="700" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                  {shortId(n.id)}
                </text>
                <text x="38" y={y + 8} fontSize="9" fill={color} fontWeight="700" letterSpacing="0.5">
                  {n.status}
                </text>
                <text x="38" y={y + 20} fontSize="9" fill="var(--muted)">
                  {n.entries.length} {t("wft_logs_short")}
                  {" · "}
                  {n.lastAt > n.firstAt ? fmtDuration(n.lastAt - n.firstAt) : t("wft_instant")}
                </text>

                <line
                  x1={padL - 12}
                  y1={y}
                  x2={width - padR + 12}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                  opacity="0.5"
                />

                {x2 > x1 && (
                  <>
                    <rect
                      x={x1}
                      y={y - 5}
                      width={x2 - x1}
                      height={10}
                      rx={5}
                      fill={color}
                      opacity="0.18"
                    />
                    <rect
                      x={x1}
                      y={y - 2}
                      width={x2 - x1}
                      height={4}
                      rx={2}
                      fill={color}
                      opacity="0.55"
                    />
                  </>
                )}

                {n.entries.map((e) => {
                  const ex = xFor(Date.parse(e.createddate));
                  const isAdmin = e.createduser === "admin";
                  const c = statusColor(e.nodeinstancestatus);
                  return (
                    <g key={e.nodeinstancelogid}>
                      <circle cx={ex} cy={y} r={9} fill={c} opacity="0.15" />
                      {isAdmin ? (
                        <polygon
                          points={`${ex},${y - 6} ${ex + 6},${y} ${ex},${y + 6} ${ex - 6},${y}`}
                          fill={c}
                          stroke="var(--bg)"
                          strokeWidth="1.5"
                        />
                      ) : (
                        <circle cx={ex} cy={y} r={5} fill={c} stroke="var(--bg)" strokeWidth="1.5" />
                      )}
                      <title>{`${e.nodeinstancestatus} · ${e.useraction} · ${e.createduser} · ${fmtTime(Date.parse(e.createddate))}`}</title>
                    </g>
                  );
                })}

                <text
                  x={x1}
                  y={y - 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill={statusColor(first.nodeinstancestatus)}
                  fontWeight="700"
                  letterSpacing="0.4"
                >
                  {first.nodeinstancestatus}
                </text>
                {last !== first && (
                  <text
                    x={x2}
                    y={y - 14}
                    textAnchor="middle"
                    fontSize="9"
                    fill={statusColor(last.nodeinstancestatus)}
                    fontWeight="700"
                    letterSpacing="0.4"
                  >
                    {last.nodeinstancestatus}
                  </text>
                )}
                <text x={x1} y={y + 22} textAnchor="middle" fontSize="9" fill="var(--muted)">
                  {t("wft_by")} {first.createduser}
                </text>
                {last !== first && (
                  <text x={x2} y={y + 22} textAnchor="middle" fontSize="9" fill="var(--muted)">
                    {t("wft_by")} {last.createduser}
                  </text>
                )}
              </g>
            );
          })}

          {handoffs.map((h, i) => {
            const fx = xFor(h.fromT);
            const fy = topPad + h.fromRow * rowH + rowH / 2;
            const tx = xFor(h.toT);
            const ty = topPad + h.toRow * rowH + rowH / 2;
            const delta = h.toT - h.fromT;
            const midX = (fx + tx) / 2;
            const midY = (fy + ty) / 2;
            return (
              <g key={i} color="var(--muted)">
                <line
                  x1={fx}
                  y1={fy}
                  x2={tx}
                  y2={ty}
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeDasharray="4 3"
                  markerEnd="url(#wft-arrow)"
                  opacity="0.7"
                />
                <rect
                  x={midX - 36}
                  y={midY - 8}
                  width="72"
                  height="14"
                  rx="7"
                  fill="var(--bg)"
                  stroke="var(--border)"
                  opacity="0.95"
                />
                <text x={midX} y={midY + 2} textAnchor="middle" fontSize="9" fill="var(--muted)" fontWeight="600">
                  {t("wft_handoff")} {fmtDelta(delta)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="wft-tl-legend">
        <span className="wft-legend-item">
          <span className="wft-dot" style={{ background: statusColor("CREATED") }} /> CREATED
        </span>
        <span className="wft-legend-item">
          <span className="wft-dot" style={{ background: statusColor("IN_PROGRESS") }} /> IN_PROGRESS
        </span>
        <span className="wft-legend-item">
          <span className="wft-dot" style={{ background: statusColor("COMPLETED") }} /> COMPLETED
        </span>
        <span className="wft-legend-item">
          <span className="wft-diamond" /> action by admin
        </span>
        <span className="wft-legend-item">
          <span className="wft-dash" /> hand-off
        </span>
      </div>
      <style jsx>{`
        .wft-timeline-card {
          border: 1px solid var(--border); border-radius: 14px;
          background: var(--bg-elev, var(--bg));
          overflow: hidden;
        }
        .wft-tl-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; border-bottom: 1px solid var(--border);
          flex-wrap: wrap; gap: 10px;
          background: color-mix(in oklab, var(--accent) 3%, transparent);
        }
        .wft-tl-title { display: flex; align-items: center; gap: 8px; color: var(--text); }
        .wft-tl-title h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--text); }
        .wft-tl-spacing {
          display: flex; align-items: center; gap: 10px;
          font-size: 10px; color: var(--muted);
          text-transform: uppercase; letter-spacing: .5px; font-weight: 600;
        }
        .wft-seg {
          display: inline-flex; border: 1px solid var(--border); border-radius: 8px;
          overflow: hidden; background: var(--bg);
          padding: 2px;
          gap: 2px;
        }
        .wft-seg button {
          font-family: inherit; font-size: 11px; font-weight: 600;
          padding: 4px 10px; border: none; background: transparent;
          color: var(--muted); cursor: pointer; border-radius: 6px;
          letter-spacing: 0;
          text-transform: none;
        }
        .wft-seg button:hover { color: var(--text); }
        .wft-seg button.is-on { background: var(--accent); color: #fff; }
        .wft-tl-scroll { overflow-x: auto; padding: 8px 0; }
        .wft-tl-scroll::-webkit-scrollbar { height: 8px; }
        .wft-tl-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        .wft-tl-svg { min-width: 820px; display: block; }
        .wft-tl-legend {
          display: flex; flex-wrap: wrap; gap: 14px; align-items: center;
          padding: 10px 16px; border-top: 1px solid var(--border);
          font-size: 11px; color: var(--muted);
          background: var(--bg);
        }
        .wft-legend-item { display: inline-flex; align-items: center; gap: 6px; }
        .wft-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .wft-diamond {
          width: 10px; height: 10px; display: inline-block;
          background: var(--muted); transform: rotate(45deg);
        }
        .wft-dash {
          width: 20px; height: 0;
          border-top: 1.5px dashed var(--muted); display: inline-block;
        }
      `}</style>
    </div>
  );
}

function LogEntriesTable({ workflow }: { workflow: Workflow }) {
  const { t } = useI18n();
  const rows = useMemo(() => {
    return workflow.entries.map((e, i) => {
      const prev = i > 0 ? workflow.entries[i - 1] : null;
      const curMs = Date.parse(e.createddate);
      const delta = prev ? curMs - Date.parse(prev.createddate) : 0;
      return { e, delta, isFirst: i === 0 };
    });
  }, [workflow]);

  return (
    <div className="wft-logs">
      <div className="wft-logs-head">
        <IconListDetails size={16} />
        <h3>{t("wft_log_entries")}</h3>
        <span className="wft-logs-count">{rows.length}</span>
      </div>
      <div className="wft-logs-scroll">
        <table>
          <thead>
            <tr>
              <th>{t("wft_log_time")}</th>
              <th>{t("wft_log_node")}</th>
              <th>{t("wft_log_status")}</th>
              <th>{t("wft_log_action")}</th>
              <th>{t("wft_log_by")}</th>
              <th>{t("wft_log_since")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, delta, isFirst }) => (
              <tr key={e.nodeinstancelogid}>
                <td className="mono">{fmtTime(Date.parse(e.createddate))}</td>
                <td className="mono">
                  <span className="wft-node-tag">{shortId(e.nodeinstanceid)}</span>
                </td>
                <td>
                  <span className="wft-status-cell">
                    <span className="wft-status-dot" style={{ background: statusColor(e.nodeinstancestatus) }} />
                    <Badge tone={statusTone(e.nodeinstancestatus)} size="sm" variant="soft">
                      {e.nodeinstancestatus}
                    </Badge>
                  </span>
                </td>
                <td>{e.useraction}</td>
                <td className="mono">{e.createduser}</td>
                <td className="mono muted">{isFirst ? "—" : fmtDelta(delta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .wft-logs {
          border: 1px solid var(--border); border-radius: 14px;
          background: var(--bg-elev, var(--bg)); overflow: hidden;
        }
        .wft-logs-head {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px; border-bottom: 1px solid var(--border);
          background: color-mix(in oklab, var(--accent) 3%, transparent);
          color: var(--text);
        }
        .wft-logs-head h3 { margin: 0; font-size: 14px; font-weight: 700; }
        .wft-logs-count {
          margin-left: auto;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 999px;
          background: color-mix(in oklab, var(--accent) 12%, transparent);
          color: var(--accent);
          font-weight: 600;
        }
        .wft-logs-scroll { overflow-x: auto; max-height: 420px; overflow-y: auto; }
        .wft-logs-scroll::-webkit-scrollbar { width: 6px; height: 8px; }
        .wft-logs-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        th, td {
          padding: 9px 14px; text-align: left;
          border-bottom: 1px solid var(--border);
          color: var(--text); vertical-align: middle;
        }
        th {
          font-size: 10px; text-transform: uppercase; letter-spacing: .5px;
          color: var(--muted); font-weight: 700;
          background: var(--bg); position: sticky; top: 0; z-index: 1;
        }
        tbody tr { transition: background .1s; }
        tbody tr:nth-child(even) { background: color-mix(in oklab, var(--text) 2%, transparent); }
        tbody tr:hover { background: color-mix(in oklab, var(--accent) 6%, transparent); }
        tbody tr:last-child td { border-bottom: none; }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
        }
        .muted { color: var(--muted); }
        .wft-node-tag {
          display: inline-block;
          padding: 2px 8px; border-radius: 6px;
          background: color-mix(in oklab, var(--text) 6%, transparent);
          color: var(--text); font-size: 11px;
        }
        .wft-status-cell { display: inline-flex; align-items: center; gap: 6px; }
        .wft-status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
      `}</style>
    </div>
  );
}
