"use client";
import { useToast } from "@/components/Toast";
import { useToolsState } from "@/components/ToolsProvider";
import { TOOL_ICON_NAMES, ToolIcon } from "@/lib/tool-icons";
import { CATEGORY_ORDER, type Tool, type ToolCategory } from "@/lib/tools-shared";
import {
  IconApps,
  IconDatabase,
  IconEdit,
  IconEyeOff,
  IconLayoutGrid,
  IconPlus,
  IconToggleRight,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import AdminBody from "../AdminBody";

type Row = {
  href: string;
  icon_name: string;
  title: string;
  sub_vi: string;
  sub_en: string;
  desc_vi: string;
  desc_en: string;
  tags: string[] | null;
  category: ToolCategory;
  sort: number | null;
  active: boolean | null;
};

type FilterCat = "all" | ToolCategory;

const emptyTool: Tool = {
  href: "",
  iconName: "IconLock",
  title: "",
  sub: { vi: "", en: "" },
  desc: { vi: "", en: "" },
  tags: [],
  category: "cat_dev",
  sort: 0,
  active: true,
};

const catLabels: Record<ToolCategory, string> = {
  cat_text: "Text",
  cat_media: "Media",
  cat_dev: "Dev",
  cat_life: "Life",
};

function rowToTool(r: Row): Tool {
  return {
    href: r.href,
    iconName: r.icon_name,
    title: r.title,
    sub: { vi: r.sub_vi, en: r.sub_en },
    desc: { vi: r.desc_vi, en: r.desc_en },
    tags: r.tags ?? [],
    category: r.category,
    sort: r.sort ?? 0,
    active: r.active ?? true,
  };
}

export default function MenuTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tool | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<FilterCat>("all");
  const [q, setQ] = useState("");
  const toast = useToast();
  const { reload: reloadPublicTools } = useToolsState();

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/tools", { cache: "no-store" });
    const j = await res.json();
    if (j.ok) setTools((j.tools as Row[]).map(rowToTool));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<ToolCategory, number> = { cat_text: 0, cat_media: 0, cat_dev: 0, cat_life: 0 };
    for (const t of tools) c[t.category]++;
    return c;
  }, [tools]);

  const activeCount = useMemo(() => tools.filter((t) => t.active ?? true).length, [tools]);
  const hiddenCount = tools.length - activeCount;

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tools.filter((t) => {
      if (filter !== "all" && t.category !== filter) return false;
      if (!needle) return true;
      return (
        t.title.toLowerCase().includes(needle) ||
        t.href.toLowerCase().includes(needle) ||
        t.tags.some((x) => x.toLowerCase().includes(needle))
      );
    });
  }, [tools, filter, q]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setErr("");
    const method = isNew ? "POST" : "PUT";
    const wasNew = isNew;
    const res = await fetch("/api/admin/tools", {
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
    setEditing(null);
    setIsNew(false);
    toast(wasNew ? "Đã thêm tool" : "Đã lưu thay đổi");
    load();
    reloadPublicTools();
  }

  async function remove(href: string) {
    if (!confirm(`Xoá ${href}?`)) return;
    const res = await fetch("/api/admin/tools", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ href }),
    });
    toast(res.ok ? `Đã xoá ${href}` : "Xoá thất bại");
    load();
    reloadPublicTools();
  }

  async function toggleActive(t: Tool) {
    const next = !(t.active ?? true);
    setTools((cur) => cur.map((x) => (x.href === t.href ? { ...x, active: next } : x)));
    const res = await fetch("/api/admin/tools", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ href: t.href, active: next }),
    });
    if (!res.ok) {
      toast("Cập nhật thất bại");
      load();
    } else {
      toast(next ? `Đã bật ${t.title}` : `Đã ẩn ${t.title}`);
      reloadPublicTools();
    }
  }

  async function seed() {
    if (!confirm("Seed 23 tools mặc định vào Supabase? (upsert theo href)")) return;
    const res = await fetch("/api/admin/seed", { method: "POST" });
    const j = await res.json();
    if (!j.ok) {
      toast("Seed thất bại: " + j.error);
      return;
    }
    toast("Đã seed tools mặc định");
    load();
    reloadPublicTools();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin";
  }

  const set = <K extends keyof Tool>(k: K, v: Tool[K]) => setEditing((cur) => (cur ? { ...cur, [k]: v } : cur));

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} />, href: "/admin" },
        { label: "Menu", current: true, badge: <span className="fx-badge">{tools.length}</span> },
      ]}
      search={{ value: q, onChange: setQ }}
      onLogout={logout}
      headerActions={
        <>
          <button onClick={seed} className="fx-btn" title="Seed defaults">
            <IconDatabase size={14} stroke={1.9} /> Seed
          </button>
          <button
            onClick={() => {
              setEditing({ ...emptyTool });
              setIsNew(true);
            }}
            className="fx-btn fx-btn-primary"
          >
            <IconPlus size={14} stroke={2.2} /> Thêm
          </button>
        </>
      }
      stats={
        <>
          <div className="fx-stat">
            <span className="fx-stat-ico"><IconApps size={18} stroke={1.9} /></span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{tools.length}</span>
              <span className="fx-stat-lbl">Tổng tools</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="ok">
            <span className="fx-stat-ico"><IconToggleRight size={18} stroke={1.9} /></span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{activeCount}</span>
              <span className="fx-stat-lbl">Đang hiển thị</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="mute">
            <span className="fx-stat-ico"><IconEyeOff size={18} stroke={1.9} /></span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{hiddenCount}</span>
              <span className="fx-stat-lbl">Đang ẩn</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="info">
            <span className="fx-stat-ico"><IconLayoutGrid size={18} stroke={1.9} /></span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{CATEGORY_ORDER.length}</span>
              <span className="fx-stat-lbl">Nhóm danh mục</span>
            </span>
          </div>
        </>
      }
      tabs={
        <>
          <button className={`fx-tab${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>
            Tất cả <span className="fx-tab-count">{tools.length}</span>
          </button>
          {CATEGORY_ORDER.map((c) => (
            <button key={c} className={`fx-tab${filter === c ? " on" : ""}`} onClick={() => setFilter(c)}>
              {catLabels[c]} <span className="fx-tab-count">{counts[c]}</span>
            </button>
          ))}
        </>
      }
    >
        {loading ? (
          <div className="fx-empty">Đang tải…</div>
        ) : visible.length === 0 ? (
          <div className="fx-empty">
            <div className="fx-empty-ico">
              <IconDatabase size={22} stroke={1.7} />
            </div>
            {tools.length === 0 ? "Chưa có tool nào. Bấm Seed để nạp 23 tools mặc định." : "Không có kết quả phù hợp."}
          </div>
        ) : (
          <div className="fx-table">
            <div className="fx-row fx-row-head">
              <div />
              <div>Tool</div>
              <div>Category</div>
              <div>Active</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
            {visible.map((t) => {
              const active = t.active ?? true;
              return (
                <div key={t.href} className={`fx-row${active ? "" : " dim"}`}>
                  <div className="fx-icon-cell">
                    <ToolIcon name={t.iconName} size={18} stroke={1.7} />
                  </div>
                  <div className="fx-title-cell">
                    <div className="fx-t-row">
                      <b>{t.title}</b>
                      <span className="fx-t-href">{t.href}</span>
                    </div>
                    <span className="fx-t-sub">{t.sub.vi}</span>
                  </div>
                  <div>
                    <span className="fx-cat-cell" data-cat={t.category}>
                      {catLabels[t.category]}
                    </span>
                  </div>
                  <div>
                    <button
                      className={`fx-switch${active ? " on" : ""}`}
                      onClick={() => toggleActive(t)}
                      aria-label={active ? "Deactivate" : "Activate"}
                      title={active ? "Đang hiện — bấm để ẩn" : "Đang ẩn — bấm để hiện"}
                    />
                  </div>
                  <div className="fx-row-actions">
                    <button
                      className="fx-btn fx-btn-icon"
                      onClick={() => {
                        setEditing({ ...t });
                        setIsNew(false);
                      }}
                      title="Sửa"
                    >
                      <IconEdit size={14} stroke={1.9} />
                    </button>
                    <button className="fx-btn fx-btn-icon fx-btn-danger" onClick={() => remove(t.href)} title="Xoá">
                      <IconTrash size={14} stroke={1.9} />
                    </button>
                  </div>
                </div>
              );
            })}
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
                    <IconPlus size={16} stroke={2} /> Thêm tool mới
                  </>
                ) : (
                  <>
                    <IconEdit size={16} stroke={2} /> Sửa: {editing.title || editing.href}
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
                  <label>href *</label>
                  <input
                    value={editing.href}
                    onChange={(e) => set("href", e.target.value)}
                    disabled={!isNew}
                    placeholder="/tool-path"
                  />
                </div>
                <div className="fx-field">
                  <label>Title *</label>
                  <input value={editing.title} onChange={(e) => set("title", e.target.value)} />
                </div>
              </div>
              <div className="fx-grid2">
                <div className="fx-field">
                  <label>Icon</label>
                  <select value={editing.iconName} onChange={(e) => set("iconName", e.target.value)}>
                    {TOOL_ICON_NAMES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fx-field">
                  <label>Category</label>
                  <select value={editing.category} onChange={(e) => set("category", e.target.value as ToolCategory)}>
                    {CATEGORY_ORDER.map((c) => (
                      <option key={c} value={c}>
                        {catLabels[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fx-grid2">
                <div className="fx-field">
                  <label>Sub (VI)</label>
                  <input value={editing.sub.vi} onChange={(e) => set("sub", { ...editing.sub, vi: e.target.value })} />
                </div>
                <div className="fx-field">
                  <label>Sub (EN)</label>
                  <input value={editing.sub.en} onChange={(e) => set("sub", { ...editing.sub, en: e.target.value })} />
                </div>
              </div>
              <div className="fx-field">
                <label>Desc (VI)</label>
                <textarea
                  value={editing.desc.vi}
                  onChange={(e) => set("desc", { ...editing.desc, vi: e.target.value })}
                />
              </div>
              <div className="fx-field">
                <label>Desc (EN)</label>
                <textarea
                  value={editing.desc.en}
                  onChange={(e) => set("desc", { ...editing.desc, en: e.target.value })}
                />
              </div>
              <div className="fx-grid2">
                <div className="fx-field">
                  <label>Tags (phẩy phân cách)</label>
                  <input
                    value={editing.tags.join(", ")}
                    onChange={(e) =>
                      set(
                        "tags",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </div>
                <div className="fx-field">
                  <label>Sort (nhỏ = trước)</label>
                  <input
                    type="number"
                    value={editing.sort ?? 0}
                    onChange={(e) => set("sort", Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="fx-field" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  className={`fx-switch${(editing.active ?? true) ? " on" : ""}`}
                  onClick={() => set("active", !(editing.active ?? true))}
                />
                <span style={{ fontSize: 13 }}>
                  {(editing.active ?? true) ? "Đang bật — hiện trong menu" : "Đang tắt — ẩn khỏi menu"}
                </span>
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
    </AdminBody>
  );
}
