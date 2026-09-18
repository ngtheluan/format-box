"use client";
import { useToast } from "@/components/Toast";
import { useThemesState } from "@/components/ThemesProvider";
import { useSkin } from "@/lib/skin-context";
import { SKIN_STORAGE, type Skin } from "@/lib/theme";
import type { Theme } from "@/lib/themes-shared";
import {
  IconCheck,
  IconEye,
  IconLayoutGrid,
  IconPalette,
  IconPencil,
  IconPlus,
  IconStar,
  IconToggleRight,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminBody from "../AdminBody";

type Draft = Theme;

const emptyDraft = (): Draft => ({
  id: "",
  nameVi: "",
  nameEn: "",
  descVi: "",
  descEn: "",
  swatch: ["#6366f1", "#a78bfa"],
  isDefault: false,
  enabled: true,
  sort: 100,
});

export default function ThemeManager() {
  const toast = useToast();
  const { skin: currentSkin, setSkin } = useSkin();
  const { themes, reload: reloadRaw } = useThemesState();
  const reload = async () => {
    await reloadRaw();
    try { new BroadcastChannel("fb-themes").postMessage("reload"); } catch {}
  };
  const savedSkinRef = useRef<Skin>("modern");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    savedSkinRef.current =
      (localStorage.getItem(SKIN_STORAGE.userChoice) as Skin | null) ??
      (localStorage.getItem(SKIN_STORAGE.default) as Skin | null) ??
      "modern";
  }, []);

  // Leaving the page: drop preview.
  useEffect(() => {
    return () => setSkin("modern", { persist: false });
  }, [setSkin]);

  const defaultTheme = useMemo(() => themes.find((t) => t.isDefault)?.id ?? "modern", [themes]);
  const enabledCount = themes.filter((t) => t.enabled || t.id === "modern").length;
  const hiddenCount = themes.length - enabledCount;

  const labelOf = (id: string) => themes.find((t) => t.id === id)?.nameVi ?? id;

  const setAsDefault = async (id: string) => {
    const t = themes.find((x) => x.id === id);
    if (!t) return;
    const res = await fetch("/api/admin/themes", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...t, isDefault: true }),
    });
    const j = await res.json();
    if (!j.ok) return toast(`Lỗi: ${j.error}`);
    // Cập nhật localStorage default cho khách mới.
    localStorage.setItem(SKIN_STORAGE.default, id);
    await reload();
    toast(`Đã đặt "${labelOf(id)}" làm mặc định`);
  };

  const preview = (id: string) => {
    const t = themes.find((x) => x.id === id);
    if (!t || (!t.enabled && id !== "modern")) {
      toast(`Theme đang ẩn — bật lên trước khi xem`);
      return;
    }
    setSkin(id, { persist: false });
    toast(`Đang xem trước: ${labelOf(id)}`);
  };

  const toggle = async (t: Theme) => {
    if (t.id === "modern") {
      toast("Theme Modern luôn khả dụng");
      return;
    }
    const res = await fetch("/api/admin/themes", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: t.id, enabled: !t.enabled }),
    });
    const j = await res.json();
    if (!j.ok) return toast(`Lỗi: ${j.error}`);
    if (t.enabled && currentSkin === t.id) setSkin(savedSkinRef.current, { persist: false });
    await reload();
    toast(!t.enabled ? `Đã bật "${t.nameVi}"` : `Đã ẩn "${t.nameVi}"`);
  };

  const remove = async (id: string) => {
    if (id === "modern") return;
    if (!confirm(`Xóa theme "${labelOf(id)}"?`)) return;
    const res = await fetch("/api/admin/themes", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await res.json();
    if (!j.ok) return toast(`Lỗi: ${j.error}`);
    if (currentSkin === id) setSkin("modern", { persist: false });
    await reload();
    toast(`Đã xóa "${id}"`);
  };

  const save = async () => {
    if (!editing) return;
    const t = editing;
    if (!t.id.trim() || !/^[a-z0-9-]+$/.test(t.id)) {
      return toast("ID phải viết thường, chỉ chữ/số/dấu -");
    }
    if (!t.nameVi.trim() || !t.nameEn.trim()) {
      return toast("Cần nhập tên VI và EN");
    }
    const method = creating ? "POST" : "PUT";
    const res = await fetch("/api/admin/themes", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(t),
    });
    const j = await res.json();
    if (!j.ok) return toast(`Lỗi: ${j.error}`);
    await reload();
    setEditing(null);
    setCreating(false);
    toast(creating ? `Đã tạo theme "${t.nameVi}"` : `Đã lưu "${t.nameVi}"`);
  };

  const seedFromDefaults = async () => {
    if (!confirm("Nạp lại 5 theme mặc định vào database?")) return;
    const res = await fetch("/api/admin/themes/seed", { method: "POST" });
    const j = await res.json();
    if (!j.ok) return toast(`Lỗi: ${j.error}`);
    await reload();
    toast(`Đã seed ${j.count} theme`);
  };

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin";
  }

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} />, href: "/admin" },
        { label: "Theme", current: true, badge: <span className="fx-badge">{themes.length}</span> },
      ]}
      onLogout={logout}
      headerActions={
        <>
          <button className="fx-btn" onClick={seedFromDefaults} title="Nạp lại 5 theme mặc định">
            Seed
          </button>
          <button
            className="fx-btn fx-btn-primary"
            onClick={() => {
              setEditing(emptyDraft());
              setCreating(true);
            }}
          >
            <IconPlus size={14} stroke={2} /> Tạo theme
          </button>
        </>
      }
      stats={
        <>
          <div className="fx-stat">
            <span className="fx-stat-ico"><IconPalette size={18} stroke={1.9} /></span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{themes.length}</span>
              <span className="fx-stat-lbl">Tổng theme</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="ok">
            <span className="fx-stat-ico"><IconToggleRight size={18} stroke={1.9} /></span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{enabledCount}</span>
              <span className="fx-stat-lbl">Đang bật</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="mute">
            <span className="fx-stat-ico"><IconEye size={18} stroke={1.9} /></span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{hiddenCount}</span>
              <span className="fx-stat-lbl">Đang ẩn</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="info">
            <span className="fx-stat-ico"><IconStar size={18} stroke={1.9} /></span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val" style={{ fontSize: 14 }}>{labelOf(defaultTheme)}</span>
              <span className="fx-stat-lbl">Mặc định</span>
            </span>
          </div>
        </>
      }
    >
      <div className="skin-grid">
        {themes.map((s) => {
          const isEnabled = s.enabled || s.id === "modern";
          const isDefault = s.isDefault;
          const isCurrent = currentSkin === s.id;
          return (
            <div key={s.id} className={`skin-card${isCurrent ? " current" : ""}${isEnabled ? "" : " off"}`}>
              <div
                className="skin-card-hero"
                style={{ background: `linear-gradient(135deg, ${s.swatch[0]}, ${s.swatch[1]})` }}
              >
                {isDefault && <span className="skin-badge"><IconStar size={11} stroke={2.2} /> Mặc định</span>}
                {isCurrent && <span className="skin-badge"><IconCheck size={11} stroke={2.4} /> Đang xem</span>}
              </div>
              <div className="skin-card-body">
                <div className="skin-card-title">
                  <b>{s.nameVi}</b>
                  <span>{s.nameEn}</span>
                </div>
                <code style={{ fontSize: 11, color: "var(--dim)" }}>{s.id}</code>
                <p className="skin-card-desc">{s.descVi}</p>
                <div className="skin-card-actions">
                  <button className="fx-btn" onClick={() => preview(s.id)} disabled={!isEnabled}>
                    <IconEye size={13} stroke={1.9} /> Xem
                  </button>
                  <button
                    className={`fx-btn${isDefault ? " fx-btn-primary" : ""}`}
                    onClick={() => setAsDefault(s.id)}
                    disabled={isDefault}
                  >
                    <IconStar size={13} stroke={1.9} /> Mặc định
                  </button>
                  <button className="fx-btn" onClick={() => { setEditing({ ...s }); setCreating(false); }}>
                    <IconPencil size={13} stroke={1.9} />
                  </button>
                  <button
                    className={`fx-switch${isEnabled ? " on" : ""}`}
                    onClick={() => toggle(s)}
                    disabled={s.id === "modern"}
                  />
                  {s.id !== "modern" && (
                    <button className="fx-btn" onClick={() => remove(s.id)} title="Xóa">
                      <IconTrash size={13} stroke={1.9} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="theme-modal" onClick={() => { setEditing(null); setCreating(false); }}>
          <div className="theme-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, marginBottom: 12 }}>{creating ? "Tạo theme mới" : `Sửa: ${editing.nameVi}`}</h3>
            <div className="grid2">
              <label>
                <span>ID (slug)</span>
                <input
                  value={editing.id}
                  disabled={!creating}
                  onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                  placeholder="vd: valentine"
                />
              </label>
              <label>
                <span>Sort</span>
                <input
                  type="number"
                  value={editing.sort}
                  onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) || 0 })}
                />
              </label>
              <label>
                <span>Tên VI</span>
                <input value={editing.nameVi} onChange={(e) => setEditing({ ...editing, nameVi: e.target.value })} />
              </label>
              <label>
                <span>Tên EN</span>
                <input value={editing.nameEn} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} />
              </label>
              <label>
                <span>Swatch từ</span>
                <input type="color" value={editing.swatch[0]} onChange={(e) => setEditing({ ...editing, swatch: [e.target.value, editing.swatch[1]] })} />
              </label>
              <label>
                <span>Swatch đến</span>
                <input type="color" value={editing.swatch[1]} onChange={(e) => setEditing({ ...editing, swatch: [editing.swatch[0], e.target.value] })} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Mô tả VI</span>
                <textarea rows={2} value={editing.descVi} onChange={(e) => setEditing({ ...editing, descVi: e.target.value })} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Mô tả EN</span>
                <textarea rows={2} value={editing.descEn} onChange={(e) => setEditing({ ...editing, descEn: e.target.value })} />
              </label>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--dim)" }}>
              Lưu ý: hiệu ứng nền/animation cần khai báo CSS theo selector <code>[data-skin=&quot;{editing.id || "id"}&quot;]</code> trong <code>app/globals.css</code>.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button className="fx-btn" onClick={() => { setEditing(null); setCreating(false); }}>Hủy</button>
              <button className="fx-btn fx-btn-primary" onClick={save}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .skin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }
        .skin-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg2);
          display: flex;
          flex-direction: column;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .skin-card:hover { transform: translateY(-2px); border-color: var(--border-h); }
        .skin-card.current { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent); }
        .skin-card.off { opacity: 0.55; }
        .skin-card-hero {
          position: relative;
          height: 90px;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 8px;
          gap: 6px;
        }
        .skin-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; padding: 3px 7px; border-radius: 999px;
          background: rgba(0,0,0,.35); color: #fff; backdrop-filter: blur(4px); font-weight: 600;
        }
        .skin-card-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
        .skin-card-title { display: flex; align-items: baseline; gap: 8px; }
        .skin-card-title b { font-size: 15px; color: var(--bright); }
        .skin-card-title span { font-size: 11px; color: var(--dim); }
        .skin-card-desc { font-size: 12.5px; color: var(--text); line-height: 1.5; margin: 0; min-height: 38px; }
        .skin-card-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; }

        .theme-modal {
          position: fixed; inset: 0; background: rgba(0,0,0,.55);
          display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;
        }
        .theme-dialog {
          background: var(--bg2); border: 1px solid var(--border); border-radius: 12px;
          padding: 18px; width: min(560px, 100%); max-height: 90vh; overflow: auto;
        }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .grid2 label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--dim); }
        .grid2 input, .grid2 textarea {
          background: var(--bg); color: var(--text); border: 1px solid var(--border);
          border-radius: 8px; padding: 6px 8px; font-size: 13px; font-family: inherit;
        }
        .grid2 input[type="color"] { padding: 2px; height: 34px; }
      `}</style>
    </AdminBody>
  );
}
