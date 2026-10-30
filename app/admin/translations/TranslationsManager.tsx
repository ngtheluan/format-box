"use client";
import { useToast } from "@/components/Toast";
import { useTools } from "@/components/ToolsProvider";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDatabase,
  IconEdit,
  IconLanguage,
  IconLayoutGrid,
  IconPlus,
  IconTrash,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminBody from "../AdminBody";

type Row = { key: string; vi: string; en: string; section: string; updated_at?: string };

const empty: Row = { key: "", vi: "", en: "", section: "" };

// Map từ prefix section (phần trước dấu "_" đầu tiên trong key) → slug công cụ.
// Nhiều prefix có thể cùng trỏ 1 slug. Prefix không có trong map sẽ được
// gộp vào nhóm "Chung" (nếu nằm trong GLOBAL_PREFIXES) hoặc "Khác".
const PREFIX_TO_SLUG: Record<string, string> = {
  b64: "base64",
  json: "json",
  jwt: "jwt",
  uuid: "uuid",
  qr: "qr",
  meme: "meme",
  md: "markdown",
  graph: "graph",
  img: "image",
  audio: "audio-studio",
  bill: "bill",
  fsql: "format-sql",
  cal: "calendar",
  trip: "travel-plan",
  typing: "typing-test",
  xc: "exchange-currency",
  gp: "gold",
  ft: "fuel",
  lt: "lucky-ticket",
  fp: "favicon-export",
  pb: "photobooth",
  tc: "text-case",
  ts: "timestamp",
  wt: "weather",
  wh: "wheel",
  cu: "curl",
  cl: "color",
  cd: "countdown",
  rt: "regex",
  st: "speed-test",
  lp: "license-plate",
  lbl: "license-plate",
  mtab: "responsive",
};

const GLOBAL_PREFIXES = new Set([
  "nav",
  "hero",
  "hl",
  "cat",
  "seo",
  "settings",
  "toast",
  "act",
  "acct",
  "stat",
  "sec",
  "why",
  "flappy",
  "pacman",
  "blog",
  "fx",
]);

const GROUP_ALL = "__all__";
const GROUP_GLOBAL = "__global__";
const GROUP_OTHER = "__other__";

function sectionOf(key: string): string {
  const i = key.indexOf("_");
  return i > 0 ? key.slice(0, i) : "misc";
}

function groupOf(section: string): string {
  const slug = PREFIX_TO_SLUG[section];
  if (slug) return slug;
  if (GLOBAL_PREFIXES.has(section)) return GROUP_GLOBAL;
  return GROUP_OTHER;
}

export default function TranslationsManager() {
  const tools = useTools();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>(GROUP_ALL);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const mainRef = useRef<HTMLElement>(null);

  function goPage(next: number) {
    setPage(next);
    const el = mainRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }
  const toast = useToast();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/translations", { cache: "no-store" });
    const j = await res.json();
    if (j.ok) setRows(j.translations as Row[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  // Gom nhóm: slug | GROUP_GLOBAL | GROUP_OTHER → danh sách row.
  const grouped = useMemo(() => {
    const m = new Map<string, Row[]>();
    rows.forEach((r) => {
      const s = r.section || sectionOf(r.key);
      const g = groupOf(s);
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(r);
    });
    return m;
  }, [rows]);

  const groupMeta = useMemo(() => {
    // Trả về mảng {id, label, icon, count, missing} theo thứ tự hiển thị
    const toolEntries = tools
      .map((t) => {
        const slug = t.href.replace(/^\//, "");
        const list = grouped.get(slug) || [];
        return {
          id: slug,
          label: t.title,
          icon: <IconLanguage size={14} stroke={1.9} />,
          count: list.length,
          missing: list.filter((r) => !r.vi || !r.en).length,
        };
      })
      .filter((g) => g.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label));

    const globalList = grouped.get(GROUP_GLOBAL) || [];
    const otherList = grouped.get(GROUP_OTHER) || [];

    return {
      all: {
        id: GROUP_ALL,
        label: "Tất cả",
        icon: <IconLayoutGrid size={14} stroke={1.9} />,
        count: rows.length,
        missing: rows.filter((r) => !r.vi || !r.en).length,
      },
      global: {
        id: GROUP_GLOBAL,
        label: "Chung",
        icon: <IconWorld size={14} stroke={1.9} />,
        count: globalList.length,
        missing: globalList.filter((r) => !r.vi || !r.en).length,
      },
      tools: toolEntries,
      other: {
        id: GROUP_OTHER,
        label: "Chưa phân nhóm",
        icon: <IconLanguage size={14} stroke={1.9} />,
        count: otherList.length,
        missing: otherList.filter((r) => !r.vi || !r.en).length,
      },
    };
  }, [tools, grouped, rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let src: Row[];
    if (group === GROUP_ALL) src = rows;
    else src = grouped.get(group) || [];
    return src.filter((r) => {
      if (!needle) return true;
      return (
        r.key.toLowerCase().includes(needle) ||
        r.vi.toLowerCase().includes(needle) ||
        r.en.toLowerCase().includes(needle)
      );
    });
  }, [rows, grouped, q, group]);

  // Reset về trang 1 khi đổi group hoặc search → tránh trang hiện tại rỗng.
  useEffect(() => {
    setPage(1);
  }, [group, q]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [visible, safePage],
  );

  async function save() {
    if (!editing) return;
    if (!editing.key) {
      setErr("Thiếu key");
      return;
    }
    setSaving(true);
    setErr("");
    const method = isNew ? "POST" : "PATCH";
    const res = await fetch("/api/admin/translations", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const j = await res.json();
    setSaving(false);
    if (!j.ok) {
      setErr(j.error || "Save failed");
      toast(j.error || "Lưu thất bại");
      return;
    }
    toast(isNew ? "Đã thêm key" : "Đã lưu thay đổi");
    setEditing(null);
    setIsNew(false);
    load();
  }

  async function remove(key: string) {
    if (!confirm(`Xoá key "${key}"?`)) return;
    const res = await fetch("/api/admin/translations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    toast(res.ok ? `Đã xoá ${key}` : "Xoá thất bại");
    load();
  }

  async function seed() {
    if (!confirm("Seed toàn bộ translations từ source vào Supabase?")) return;
    const res = await fetch("/api/admin/translations/seed", { method: "POST" });
    const j = await res.json();
    toast(j.ok ? `Đã seed ${j.count} key` : `Seed thất bại: ${j.error}`);
    load();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin";
  }

  const set = <K extends keyof Row>(k: K, v: Row[K]) =>
    setEditing((cur) => (cur ? { ...cur, [k]: v } : cur));

  // Prefill section + slug mặc định khi thêm key mới trong một group tool.
  function startNew() {
    const slug = Object.entries(PREFIX_TO_SLUG).find(([, v]) => v === group);
    const section = slug ? slug[0] : group === GROUP_GLOBAL || group === GROUP_OTHER || group === GROUP_ALL ? "" : "";
    setEditing({ ...empty, section });
    setIsNew(true);
  }

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} />, href: "/admin" },
        { label: "Translations", current: true, badge: <span className="fx-badge">{rows.length}</span> },
      ]}
      search={{ value: q, onChange: setQ }}
      onLogout={logout}
      headerActions={
        <>
          <button onClick={seed} className="fx-btn" title="Seed từ source dict">
            <IconDatabase size={14} stroke={1.9} /> Seed
          </button>
          <button onClick={startNew} className="fx-btn fx-btn-primary">
            <IconPlus size={14} stroke={2.2} /> Thêm key
          </button>
        </>
      }
      stats={
        <>
          <div className="fx-stat">
            <span className="fx-stat-ico">
              <IconLanguage size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{rows.length}</span>
              <span className="fx-stat-lbl">Tổng key</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="info">
            <span className="fx-stat-ico">
              <IconLanguage size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{groupMeta.tools.length}</span>
              <span className="fx-stat-lbl">Công cụ có i18n</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="ok">
            <span className="fx-stat-ico">
              <IconLanguage size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{rows.filter((r) => r.vi && r.en).length}</span>
              <span className="fx-stat-lbl">Đã dịch đủ</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="mute">
            <span className="fx-stat-ico">
              <IconLanguage size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{rows.filter((r) => !r.vi || !r.en).length}</span>
              <span className="fx-stat-lbl">Còn thiếu</span>
            </span>
          </div>
        </>
      }
    >
      {loading ? (
        <div className="fx-empty">Đang tải…</div>
      ) : (
        <div className="tr-layout">
          <aside className="tr-side">
            <SideItem meta={groupMeta.all} active={group === GROUP_ALL} onClick={() => setGroup(GROUP_ALL)} />
            <SideItem
              meta={groupMeta.global}
              active={group === GROUP_GLOBAL}
              onClick={() => setGroup(GROUP_GLOBAL)}
            />
            <div className="tr-side-sep">Công cụ</div>
            {groupMeta.tools.map((g) => (
              <SideItem key={g.id} meta={g} active={group === g.id} onClick={() => setGroup(g.id)} />
            ))}
            {groupMeta.other.count > 0 && (
              <>
                <div className="tr-side-sep">Khác</div>
                <SideItem
                  meta={groupMeta.other}
                  active={group === GROUP_OTHER}
                  onClick={() => setGroup(GROUP_OTHER)}
                />
              </>
            )}
          </aside>

          <section className="tr-main" ref={mainRef}>
            {visible.length === 0 ? (
              <div className="fx-empty">
                <div className="fx-empty-ico">
                  <IconLanguage size={22} stroke={1.7} />
                </div>
                {rows.length === 0
                  ? "Chưa có key. Bấm Seed để nạp từ source dict."
                  : "Không có kết quả phù hợp."}
              </div>
            ) : (
              <>
              <div className="fx-table">
                <div
                  className="fx-row fx-row-head"
                  style={{ gridTemplateColumns: "220px 90px 1fr 1fr 90px" }}
                >
                  <div>Key</div>
                  <div>Section</div>
                  <div>VI</div>
                  <div>EN</div>
                  <div style={{ textAlign: "right" }}>Actions</div>
                </div>
                {paged.map((r) => (
                  <div
                    key={r.key}
                    className="fx-row"
                    style={{ gridTemplateColumns: "220px 90px 1fr 1fr 90px" }}
                  >
                    <div className="fx-title-cell">
                      <code style={{ fontSize: 12 }}>{r.key}</code>
                    </div>
                    <div>
                      <span className="fx-cat-cell">{r.section || "misc"}</span>
                    </div>
                    <div style={{ fontSize: 13, opacity: r.vi ? 1 : 0.4 }}>{r.vi || "— thiếu —"}</div>
                    <div style={{ fontSize: 13, opacity: r.en ? 1 : 0.4 }}>{r.en || "— missing —"}</div>
                    <div className="fx-row-actions">
                      <button
                        className="fx-btn fx-btn-icon"
                        onClick={() => {
                          setEditing({ ...r });
                          setIsNew(false);
                        }}
                        title="Sửa"
                      >
                        <IconEdit size={14} stroke={1.9} />
                      </button>
                      <button
                        className="fx-btn fx-btn-icon fx-btn-danger"
                        onClick={() => remove(r.key)}
                        title="Xoá"
                      >
                        <IconTrash size={14} stroke={1.9} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="tr-pager">
                  <button
                    className="fx-btn fx-btn-icon"
                    onClick={() => goPage(Math.max(1, safePage - 1))}
                    disabled={safePage <= 1}
                    title="Trang trước"
                  >
                    <IconChevronLeft size={14} stroke={1.9} />
                  </button>
                  <span className="tr-pager-info">
                    Trang <strong>{safePage}</strong> / {totalPages}
                    <span className="tr-pager-sub">
                      · {(safePage - 1) * PAGE_SIZE + 1}–
                      {Math.min(safePage * PAGE_SIZE, visible.length)} / {visible.length}
                    </span>
                  </span>
                  <button
                    className="fx-btn fx-btn-icon"
                    onClick={() => goPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage >= totalPages}
                    title="Trang sau"
                  >
                    <IconChevronRight size={14} stroke={1.9} />
                  </button>
                </div>
              )}
              </>
            )}
          </section>
        </div>
      )}

      {editing && (
        <div
          className="fx-modal-bg"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div className="fx-modal">
            <div className="fx-modal-head">
              <h2>
                {isNew ? (
                  <>
                    <IconPlus size={16} stroke={2} /> Thêm key
                  </>
                ) : (
                  <>
                    <IconEdit size={16} stroke={2} /> Sửa: {editing.key}
                  </>
                )}
                <span className="fx-badge">{isNew ? "NEW" : "EDIT"}</span>
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => setEditing(null)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
              <div className="fx-grid2">
                <div className="fx-field">
                  <label>Key *</label>
                  <input
                    value={editing.key}
                    onChange={(e) => set("key", e.target.value)}
                    disabled={!isNew}
                    placeholder="nav_tools"
                  />
                </div>
                <div className="fx-field">
                  <label>Section</label>
                  <input
                    value={editing.section}
                    onChange={(e) => set("section", e.target.value)}
                    placeholder="nav"
                  />
                </div>
              </div>
              <div className="fx-field">
                <label>Tiếng Việt (VI)</label>
                <textarea value={editing.vi} onChange={(e) => set("vi", e.target.value)} rows={3} />
              </div>
              <div className="fx-field">
                <label>English (EN)</label>
                <textarea value={editing.en} onChange={(e) => set("en", e.target.value)} rows={3} />
              </div>
              {err && <div className="fx-err">{err}</div>}
            </div>
            <div className="fx-modal-foot">
              <button className="fx-btn" onClick={() => setEditing(null)}>
                Huỷ
              </button>
              <button className="fx-btn fx-btn-primary" onClick={save} disabled={saving}>
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tr-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 12px;
          align-items: start;
        }
        .tr-side {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: var(--fx-card, var(--bg));
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 6px;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.35);
          align-self: start;
        }
        .tr-side-sep {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.55;
          padding: 10px 8px 4px;
        }
        .tr-main {
          min-width: 0;
        }
        .tr-pager {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 4px 4px;
        }
        .tr-pager-info {
          font-size: 13px;
          opacity: 0.85;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .tr-pager-sub {
          opacity: 0.55;
          font-size: 12px;
        }
        @media (max-width: 820px) {
          .tr-layout {
            grid-template-columns: 1fr;
          }
          .tr-side {
            position: static;
            max-height: 240px;
            flex-direction: row;
            flex-wrap: wrap;
          }
          .tr-side-sep {
            width: 100%;
          }
        }
      `}</style>
      <style jsx global>{`
        .tr-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 9px;
          border-radius: 7px;
          font-size: 13px;
          cursor: pointer;
          background: transparent;
          border: 0;
          color: inherit;
          text-align: left;
          width: 100%;
          transition: background 0.12s;
        }
        .tr-item:hover {
          background: var(--hover, rgba(127, 127, 127, 0.08));
        }
        .tr-item.on {
          background: var(--accent-soft, rgba(99, 102, 241, 0.14));
          color: var(--accent, inherit);
        }
        .tr-item-label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tr-item-count {
          font-size: 11px;
          padding: 1px 6px;
          border-radius: 999px;
          background: var(--border);
          opacity: 0.75;
        }
        .tr-item.on .tr-item-count {
          background: var(--accent, #6366f1);
          color: #fff;
          opacity: 1;
        }
        .tr-item-missing {
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 999px;
          background: var(--warn, #d97706);
          color: #fff;
        }
      `}</style>
    </AdminBody>
  );
}

type SideMeta = {
  id: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  missing: number;
};

function SideItem({
  meta,
  active,
  onClick,
}: {
  meta: SideMeta;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`tr-item${active ? " on" : ""}`} onClick={onClick} title={meta.label}>
      {meta.icon}
      <span className="tr-item-label">{meta.label}</span>
      {meta.missing > 0 && <span className="tr-item-missing">{meta.missing}</span>}
      <span className="tr-item-count">{meta.count}</span>
    </button>
  );
}
