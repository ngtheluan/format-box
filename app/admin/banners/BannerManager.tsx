"use client";
import {
  IconBell,
  IconBellOff,
  IconBroadcast,
  IconClock,
  IconExternalLink,
  IconLayoutGrid,
  IconPencil,
  IconPlus,
  IconToggleRight,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import {
  BANNER_TONES,
  BANNER_TONE_LABEL,
  isBannerLive,
  type Banner,
  type BannerTone,
} from "@/lib/banners-shared";
import AdminBody from "../AdminBody";

type Draft = Banner;

const slugify = () =>
  `banner-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const emptyDraft = (): Draft => ({
  id: slugify(),
  messageVi: "",
  messageEn: "",
  href: "",
  ctaVi: "",
  ctaEn: "",
  tone: "info",
  enabled: true,
  dismissible: true,
  startAt: null,
  endAt: null,
  sort: 100,
  updatedAt: new Date().toISOString(),
});

// <input type="datetime-local"> works in local time with no zone; convert both ways.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function BannerManager() {
  const toast = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/banners", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.ok === false) {
      toast(`Lỗi tải: ${j.error || res.status}`);
      return;
    }
    // API returns raw DB rows; map snake_case → camelCase for the UI.
    const mapped: Banner[] = (j.banners ?? []).map((r: any) => ({
      id: r.id,
      messageVi: r.message_vi ?? "",
      messageEn: r.message_en ?? "",
      href: r.href ?? "",
      ctaVi: r.cta_vi ?? "",
      ctaEn: r.cta_en ?? "",
      tone: (r.tone ?? "info") as BannerTone,
      enabled: r.enabled ?? true,
      dismissible: r.dismissible ?? true,
      startAt: r.start_at ?? null,
      endAt: r.end_at ?? null,
      sort: r.sort ?? 0,
      updatedAt: r.updated_at ?? new Date(0).toISOString(),
    }));
    setBanners(mapped);
  }, [toast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const notifyPublic = () => {
    try {
      new BroadcastChannel("fb-banners").postMessage("reload");
    } catch {}
  };

  const liveCount = useMemo(() => banners.filter((b) => isBannerLive(b)).length, [banners]);
  const enabledCount = useMemo(() => banners.filter((b) => b.enabled).length, [banners]);

  const toggle = async (b: Banner) => {
    const res = await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: b.id, enabled: !b.enabled }),
    });
    const j = await res.json();
    if (!j.ok) return toast(`Lỗi: ${j.error}`);
    await reload();
    notifyPublic();
    toast(!b.enabled ? "Đã bật banner" : "Đã tắt banner");
  };

  const remove = async (b: Banner) => {
    if (!confirm(`Xóa banner này?\n\n"${b.messageVi}"`)) return;
    const res = await fetch("/api/admin/banners", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: b.id }),
    });
    const j = await res.json();
    if (!j.ok) return toast(`Lỗi: ${j.error}`);
    await reload();
    notifyPublic();
    toast("Đã xóa banner");
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.messageVi.trim()) return toast("Cần nhập nội dung tiếng Việt");
    if (editing.startAt && editing.endAt && Date.parse(editing.startAt) > Date.parse(editing.endAt)) {
      return toast("Thời gian bắt đầu phải trước thời gian kết thúc");
    }
    const method = creating ? "POST" : "PUT";
    const res = await fetch("/api/admin/banners", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editing),
    });
    const j = await res.json();
    if (!j.ok) return toast(`Lỗi: ${j.error}`);
    await reload();
    notifyPublic();
    setEditing(null);
    setCreating(false);
    toast(creating ? "Đã tạo banner" : "Đã lưu banner");
  };

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin";
  }

  const statusOf = (b: Banner): { label: string; tone: string } => {
    if (!b.enabled) return { label: "Tắt", tone: "mute" };
    if (b.startAt && Date.now() < Date.parse(b.startAt)) return { label: "Đã lên lịch", tone: "info" };
    if (b.endAt && Date.now() > Date.parse(b.endAt)) return { label: "Hết hạn", tone: "mute" };
    return { label: "Đang hiển thị", tone: "ok" };
  };

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} />, href: "/admin" },
        { label: "Thông báo", current: true, badge: <span className="fx-badge">{banners.length}</span> },
      ]}
      onLogout={logout}
      headerActions={
        <button
          className="fx-btn fx-btn-primary"
          onClick={() => {
            setEditing(emptyDraft());
            setCreating(true);
          }}
        >
          <IconPlus size={14} stroke={2} /> Tạo banner
        </button>
      }
      stats={
        <>
          <div className="fx-stat">
            <span className="fx-stat-ico">
              <IconBroadcast size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{banners.length}</span>
              <span className="fx-stat-lbl">Tổng banner</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="ok">
            <span className="fx-stat-ico">
              <IconBell size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{liveCount}</span>
              <span className="fx-stat-lbl">Đang hiển thị</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="info">
            <span className="fx-stat-ico">
              <IconToggleRight size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{enabledCount}</span>
              <span className="fx-stat-lbl">Đang bật</span>
            </span>
          </div>
        </>
      }
      title="Thông báo / Banner"
      description="Tạo banner hiển thị trên đầu trang chủ. Có thể bật/tắt, đặt lịch và cho phép người dùng đóng."
    >
      {banners.length === 0 ? (
        <div className="fx-card" style={{ padding: 32, textAlign: "center", color: "var(--dim)" }}>
          <IconBellOff size={28} stroke={1.6} style={{ opacity: 0.6 }} />
          <p style={{ margin: "10px 0 0" }}>Chưa có banner nào. Bấm "Tạo banner" để thêm.</p>
        </div>
      ) : (
        <div className="fx-list">
          {banners.map((b) => {
            const st = statusOf(b);
            return (
              <div key={b.id} className="fx-card fx-row-card" data-banner-tone={b.tone}>
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="fx-badge" data-tone={st.tone}>
                      {st.label}
                    </span>
                    <span className="fx-badge">{BANNER_TONE_LABEL[b.tone]}</span>
                    <b style={{ color: "var(--bright)" }}>{b.messageVi}</b>
                  </div>
                  {b.messageEn && (
                    <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{b.messageEn}</div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6, display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {b.href && (
                      <span>
                        <IconExternalLink size={11} stroke={1.8} /> {b.ctaVi || "Link"} → {b.href}
                      </span>
                    )}
                    <span>
                      <IconClock size={11} stroke={1.8} /> {fmt(b.startAt)} → {fmt(b.endAt)}
                    </span>
                    <span>ưu tiên {b.sort}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
                  <button
                    className="fx-btn"
                    onClick={() => {
                      setEditing({ ...b });
                      setCreating(false);
                    }}
                  >
                    <IconPencil size={13} stroke={1.9} />
                  </button>
                  <button className={`fx-switch${b.enabled ? " on" : ""}`} onClick={() => toggle(b)} />
                  <button className="fx-btn" onClick={() => remove(b)} title="Xóa">
                    <IconTrash size={13} stroke={1.9} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div
          className="theme-modal"
          onClick={() => {
            setEditing(null);
            setCreating(false);
          }}
        >
          <div className="theme-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, marginBottom: 12 }}>{creating ? "Tạo banner mới" : "Sửa banner"}</h3>
            <div className="grid2">
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Nội dung VI *</span>
                <textarea
                  rows={2}
                  value={editing.messageVi}
                  onChange={(e) => setEditing({ ...editing, messageVi: e.target.value })}
                  placeholder="vd: Hệ thống bảo trì lúc 23:00 hôm nay."
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Nội dung EN</span>
                <textarea
                  rows={2}
                  value={editing.messageEn}
                  onChange={(e) => setEditing({ ...editing, messageEn: e.target.value })}
                />
              </label>
              <label>
                <span>Link (tùy chọn)</span>
                <input
                  value={editing.href}
                  onChange={(e) => setEditing({ ...editing, href: e.target.value })}
                  placeholder="/json hoặc https://..."
                />
              </label>
              <label>
                <span>Loại</span>
                <select
                  value={editing.tone}
                  onChange={(e) => setEditing({ ...editing, tone: e.target.value as BannerTone })}
                >
                  {BANNER_TONES.map((t) => (
                    <option key={t} value={t}>
                      {BANNER_TONE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Nhãn nút VI</span>
                <input
                  value={editing.ctaVi}
                  onChange={(e) => setEditing({ ...editing, ctaVi: e.target.value })}
                  placeholder="Xem ngay"
                />
              </label>
              <label>
                <span>Nhãn nút EN</span>
                <input
                  value={editing.ctaEn}
                  onChange={(e) => setEditing({ ...editing, ctaEn: e.target.value })}
                  placeholder="Learn more"
                />
              </label>
              <label>
                <span>Bắt đầu (tùy chọn)</span>
                <input
                  type="datetime-local"
                  value={isoToLocalInput(editing.startAt)}
                  onChange={(e) => setEditing({ ...editing, startAt: localInputToIso(e.target.value) })}
                />
              </label>
              <label>
                <span>Kết thúc (tùy chọn)</span>
                <input
                  type="datetime-local"
                  value={isoToLocalInput(editing.endAt)}
                  onChange={(e) => setEditing({ ...editing, endAt: localInputToIso(e.target.value) })}
                />
              </label>
              <label>
                <span>Ưu tiên (cao hiện trước)</span>
                <input
                  type="number"
                  value={editing.sort}
                  onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) || 0 })}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={editing.dismissible}
                  onChange={(e) => setEditing({ ...editing, dismissible: e.target.checked })}
                  style={{ width: "auto" }}
                />
                <span style={{ margin: 0 }}>Cho phép đóng</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button
                className="fx-btn"
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
              >
                Hủy
              </button>
              <button className="fx-btn fx-btn-primary" onClick={save}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminBody>
  );
}
