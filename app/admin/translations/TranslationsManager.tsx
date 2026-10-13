"use client";
import { useToast } from "@/components/Toast";
import {
  IconDatabase,
  IconEdit,
  IconLanguage,
  IconLayoutGrid,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import AdminBody from "../AdminBody";

type Row = { key: string; vi: string; en: string; section: string; updated_at?: string };

const empty: Row = { key: "", vi: "", en: "", section: "" };

export default function TranslationsManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [section, setSection] = useState<string>("all");
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

  const sections = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.section || "misc"));
    return Array.from(s).sort();
  }, [rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => (c[r.section || "misc"] = (c[r.section || "misc"] || 0) + 1));
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (section !== "all" && (r.section || "misc") !== section) return false;
      if (!needle) return true;
      return (
        r.key.toLowerCase().includes(needle) ||
        r.vi.toLowerCase().includes(needle) ||
        r.en.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, section]);

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
          <button
            onClick={() => {
              setEditing({ ...empty });
              setIsNew(true);
            }}
            className="fx-btn fx-btn-primary"
          >
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
              <IconLayoutGrid size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{sections.length}</span>
              <span className="fx-stat-lbl">Section</span>
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
      tabs={
        <>
          <button className={`fx-tab${section === "all" ? " on" : ""}`} onClick={() => setSection("all")}>
            Tất cả <span className="fx-tab-count">{rows.length}</span>
          </button>
          {sections.map((s) => (
            <button key={s} className={`fx-tab${section === s ? " on" : ""}`} onClick={() => setSection(s)}>
              {s} <span className="fx-tab-count">{counts[s]}</span>
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
            <IconLanguage size={22} stroke={1.7} />
          </div>
          {rows.length === 0 ? "Chưa có key. Bấm Seed để nạp từ source dict." : "Không có kết quả phù hợp."}
        </div>
      ) : (
        <div className="fx-table">
          <div className="fx-row fx-row-head" style={{ gridTemplateColumns: "220px 100px 1fr 1fr 90px" }}>
            <div>Key</div>
            <div>Section</div>
            <div>VI</div>
            <div>EN</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>
          {visible.map((r) => (
            <div
              key={r.key}
              className="fx-row"
              style={{ gridTemplateColumns: "220px 100px 1fr 1fr 90px" }}
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
    </AdminBody>
  );
}
