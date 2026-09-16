"use client";
import { useToast } from "@/components/Toast";
import { useSkin } from "@/lib/skin-context";
import { readEnabledSkins, SKIN_DESCRIPTIONS, SKIN_STORAGE, SKINS, type Skin } from "@/lib/theme";
import {
  IconCheck,
  IconEye,
  IconLayoutGrid,
  IconPalette,
  IconRestore,
  IconSparkles,
  IconStar,
  IconToggleRight,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import AdminBody from "../AdminBody";

export default function ThemeManager() {
  const toast = useToast();
  const { skin: currentSkin, setSkin } = useSkin();
  const [defaultSkin, setDefaultSkin] = useState<Skin>("modern");
  const [enabled, setEnabled] = useState<Skin[]>(SKINS.map((s) => s.id));
  const savedSkinRef = useRef<Skin>("modern");

  useEffect(() => {
    const d = (localStorage.getItem(SKIN_STORAGE.default) as Skin | null) ?? "modern";
    setDefaultSkin(d);
    setEnabled(readEnabledSkins());
    savedSkinRef.current =
      (localStorage.getItem(SKIN_STORAGE.userChoice) as Skin | null) ?? d ?? "modern";
  }, []);

  // On leaving /admin/theme, drop the theme entirely (visual only — the
  // saved choice in localStorage stays, so a reload restores it).
  useEffect(() => {
    return () => setSkin("modern", { persist: false });
  }, [setSkin]);

  const enabledCount = enabled.length;
  const hiddenCount = SKINS.length - enabledCount;

  const setAsDefault = (s: Skin) => {
    setDefaultSkin(s);
    localStorage.setItem(SKIN_STORAGE.default, s);
    toast(`Đã đặt "${labelOf(s)}" làm theme mặc định`);
  };

  const preview = (s: Skin) => {
    if (!enabled.includes(s)) {
      toast(`Theme "${labelOf(s)}" đang ẩn — bật lên trước khi xem`);
      return;
    }
    setSkin(s, { persist: false });
    toast(`Đang xem trước: ${labelOf(s)} (chỉ trong trang này)`);
  };

  const toggle = (s: Skin) => {
    if (s === "modern") {
      toast("Theme Modern luôn khả dụng");
      return;
    }
    const next = enabled.includes(s) ? enabled.filter((x) => x !== s) : [...enabled, s];
    setEnabled(next);
    localStorage.setItem(SKIN_STORAGE.enabled, JSON.stringify(next));
    // If we just disabled the theme currently being previewed, drop the preview.
    if (!next.includes(s) && currentSkin === s) {
      setSkin(savedSkinRef.current, { persist: false });
    }
    toast(next.includes(s) ? `Đã bật "${labelOf(s)}"` : `Đã ẩn "${labelOf(s)}"`);
  };

  const resetAll = () => {
    if (!confirm("Đặt lại: bật tất cả theme, mặc định = Modern?")) return;
    const all = SKINS.map((s) => s.id);
    setEnabled(all);
    setDefaultSkin("modern");
    localStorage.setItem(SKIN_STORAGE.enabled, JSON.stringify(all));
    localStorage.setItem(SKIN_STORAGE.default, "modern");
    setSkin("modern");
    toast("Đã đặt lại theme về mặc định");
  };

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin";
  }

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} />, href: "/admin" },
        { label: "Theme", current: true, badge: <span className="fx-badge">{SKINS.length}</span> },
      ]}
      onLogout={logout}
      headerActions={
        <button className="fx-btn" onClick={resetAll} title="Đặt lại về mặc định">
          <IconRestore size={14} stroke={1.9} /> Đặt lại
        </button>
      }
      stats={
        <>
          <div className="fx-stat">
            <span className="fx-stat-ico">
              <IconPalette size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{SKINS.length}</span>
              <span className="fx-stat-lbl">Tổng theme</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="ok">
            <span className="fx-stat-ico">
              <IconToggleRight size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{enabledCount}</span>
              <span className="fx-stat-lbl">Đang bật</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="mute">
            <span className="fx-stat-ico">
              <IconEye size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{hiddenCount}</span>
              <span className="fx-stat-lbl">Đang ẩn</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="info">
            <span className="fx-stat-ico">
              <IconStar size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val" style={{ fontSize: 14 }}>
                {labelOf(defaultSkin)}
              </span>
              <span className="fx-stat-lbl">Mặc định</span>
            </span>
          </div>
        </>
      }
    >
      <div
        style={{
          padding: "12px 14px",
          marginBottom: 12,
          border: "1px solid var(--border)",
          borderRadius: 10,
          background: "var(--bg2)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          color: "var(--text)",
        }}
      >
        <IconSparkles size={16} stroke={1.9} style={{ color: "var(--accent)" }} />
        <span>
          Đang xem trước: <b style={{ color: "var(--bright)" }}>{labelOf(currentSkin)}</b>. Đổi tại đây áp dụng ngay cho
          phiên hiện tại. Theme <b>Mặc định</b> áp dụng cho khách chưa từng chọn theme.
        </span>
      </div>

      <div className="skin-grid">
        {SKINS.map((s) => {
          const isEnabled = enabled.includes(s.id);
          const isDefault = defaultSkin === s.id;
          const isCurrent = currentSkin === s.id;
          return (
            <div key={s.id} className={`skin-card${isCurrent ? " current" : ""}${isEnabled ? "" : " off"}`}>
              <div
                className="skin-card-hero"
                style={{ background: `linear-gradient(135deg, ${s.swatch[0]}, ${s.swatch[1]})` }}
              >
                {isDefault && (
                  <span className="skin-badge">
                    <IconStar size={11} stroke={2.2} /> Mặc định
                  </span>
                )}
                {isCurrent && (
                  <span className="skin-badge">
                    <IconCheck size={11} stroke={2.4} /> Đang xem
                  </span>
                )}
              </div>
              <div className="skin-card-body">
                <div className="skin-card-title">
                  <b>{s.vi}</b>
                  <span>{s.en}</span>
                </div>
                <p className="skin-card-desc">{SKIN_DESCRIPTIONS[s.id].vi}</p>
                <div className="skin-card-actions">
                  <button
                    className="fx-btn"
                    onClick={() => preview(s.id)}
                    disabled={!isEnabled}
                    title={isEnabled ? "Xem thử theme này" : "Theme đang ẩn — bật lên để xem"}
                  >
                    <IconEye size={13} stroke={1.9} /> Xem trước
                  </button>
                  <button
                    className={`fx-btn${isDefault ? " fx-btn-primary" : ""}`}
                    onClick={() => setAsDefault(s.id)}
                    disabled={isDefault}
                  >
                    <IconStar size={13} stroke={1.9} /> {isDefault ? "Mặc định" : "Đặt mặc định"}
                  </button>
                  <button
                    className={`fx-switch${isEnabled ? " on" : ""}`}
                    onClick={() => toggle(s.id)}
                    title={
                      s.id === "modern" ? "Luôn khả dụng" : isEnabled ? "Đang bật — bấm để ẩn" : "Đang ẩn — bấm để bật"
                    }
                    disabled={s.id === "modern"}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
          transition:
            transform 0.15s ease,
            border-color 0.15s ease;
        }
        .skin-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-h);
        }
        .skin-card.current {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
        }
        .skin-card.off {
          opacity: 0.55;
        }
        .skin-card-hero {
          position: relative;
          height: 100px;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 8px;
          gap: 6px;
        }
        .skin-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          padding: 3px 7px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.35);
          color: #fff;
          backdrop-filter: blur(4px);
          font-weight: 600;
        }
        .skin-card-body {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .skin-card-title {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .skin-card-title b {
          font-size: 15px;
          color: var(--bright);
        }
        .skin-card-title span {
          font-size: 11px;
          color: var(--dim);
        }
        .skin-card-desc {
          font-size: 12.5px;
          color: var(--text);
          line-height: 1.5;
          margin: 0;
          min-height: 38px;
        }
        .skin-card-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
      `}</style>
    </AdminBody>
  );
}

function labelOf(s: Skin): string {
  return SKINS.find((x) => x.id === s)?.vi ?? s;
}

