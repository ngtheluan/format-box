"use client";
import {
  IconCamera,
  IconCopy,
  IconExternalLink,
  IconLayoutGrid,
  IconLoader2,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import AdminBody from "../AdminBody";

type Item = {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
  expiresAt: string;
};

function formatTime(ts: string) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("vi-VN", { hour12: false });
}

function formatBytes(n: number) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

function remaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "đã hết hạn";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `còn ${h}h ${m}m`;
  return `còn ${m}m`;
}

export default function AdminPhotoboothPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/photobooth", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.items || []);
      setTotalBytes(data.totalBytes || 0);
      setSelected(new Set());
    } catch (err: any) {
      setError(err?.message || "Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (url: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(url)) n.delete(url);
      else n.add(url);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.url)));
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Xoá ${selected.size} ảnh đã chọn?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/photobooth", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls: [...selected] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Xoá thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAll = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/photobooth", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      setConfirmAll(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Xoá thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const summary = useMemo(
    () => `${items.length} ảnh · ${formatBytes(totalBytes)}`,
    [items.length, totalBytes],
  );

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", href: "/admin", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
        { label: "Photobooth", icon: <IconCamera size={13} stroke={1.8} />, current: true },
      ]}
      title="Photobooth uploads"
      description="Ảnh user chụp xong được upload lên Vercel Blob, tự xoá sau 24 giờ."
    >
      <div className="pbadm-toolbar">
        <div className="pbadm-summary">{summary}</div>
        <div className="pbadm-actions">
          <button className="pbadm-btn" onClick={load} disabled={loading}>
            {loading ? <IconLoader2 size={14} className="spin" /> : <IconRefresh size={14} />}
            Tải lại
          </button>
          <button
            className="pbadm-btn danger"
            onClick={deleteSelected}
            disabled={busy || !selected.size}
          >
            <IconTrash size={14} /> Xoá đã chọn ({selected.size})
          </button>
          <button
            className="pbadm-btn danger-outline"
            onClick={() => setConfirmAll(true)}
            disabled={busy || !items.length}
          >
            <IconTrash size={14} /> Xoá toàn bộ
          </button>
        </div>
      </div>

      {error && <div className="pbadm-error">{error}</div>}

      {!loading && !items.length && (
        <div className="pbadm-empty">Chưa có ảnh nào được upload.</div>
      )}

      {!!items.length && (
        <>
          <label className="pbadm-select-all">
            <input
              type="checkbox"
              checked={selected.size === items.length}
              onChange={toggleAll}
            />
            Chọn tất cả
          </label>
          <div className="pbadm-grid">
            {items.map((it) => {
              const picked = selected.has(it.url);
              return (
                <div key={it.url} className={`pbadm-card${picked ? " on" : ""}`}>
                  <label className="pbadm-pick">
                    <input type="checkbox" checked={picked} onChange={() => toggle(it.url)} />
                  </label>
                  <a href={it.url} target="_blank" rel="noreferrer" className="pbadm-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.url} alt={it.pathname} loading="lazy" />
                  </a>
                  <div className="pbadm-meta">
                    <div className="pbadm-name" title={it.pathname}>
                      {it.pathname.replace(/^photobooth\//, "")}
                    </div>
                    <div className="pbadm-row">
                      <span>{formatBytes(it.size)}</span>
                      <span className="pbadm-ttl">{remaining(it.expiresAt)}</span>
                    </div>
                    <div className="pbadm-time">{formatTime(it.uploadedAt)}</div>
                    <div className="pbadm-icons">
                      <button
                        className="pbadm-icbtn"
                        onClick={() => copyLink(it.url)}
                        title="Copy link"
                      >
                        <IconCopy size={14} />
                      </button>
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        className="pbadm-icbtn"
                        title="Mở"
                      >
                        <IconExternalLink size={14} />
                      </a>
                      <button
                        className="pbadm-icbtn danger"
                        onClick={async () => {
                          if (!window.confirm(`Xoá ảnh "${it.pathname.replace(/^photobooth\//, "")}"?`)) return;
                          setBusy(true);
                          try {
                            await fetch("/api/admin/photobooth", {
                              method: "DELETE",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({ urls: [it.url] }),
                            });
                            await load();
                          } finally {
                            setBusy(false);
                          }
                        }}
                        title="Xoá"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {confirmAll && (
        <div className="pbadm-modal" onClick={() => setConfirmAll(false)}>
          <div className="pbadm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Xoá toàn bộ ảnh?</h3>
            <p>{items.length} ảnh sẽ bị xoá vĩnh viễn khỏi Vercel Blob.</p>
            <div className="pbadm-dialog-actions">
              <button className="pbadm-btn" onClick={() => setConfirmAll(false)}>Huỷ</button>
              <button className="pbadm-btn danger" onClick={deleteAll} disabled={busy}>
                {busy ? <IconLoader2 size={14} className="spin" /> : <IconTrash size={14} />} Xoá hết
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pbadm-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .pbadm-summary { font-size: 13px; opacity: 0.75; }
        .pbadm-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .pbadm-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; font-size: 13px; font-weight: 600;
          border-radius: 8px; border: 1px solid var(--border);
          background: var(--panel); color: var(--text); cursor: pointer;
        }
        .pbadm-btn:hover:not(:disabled) { border-color: var(--accent); }
        .pbadm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pbadm-btn.danger { background: var(--err, #e5484d); color: #fff; border-color: transparent; }
        .pbadm-btn.danger-outline { color: var(--err, #e5484d); border-color: var(--err, #e5484d); }
        .pbadm-error {
          padding: 8px 12px; margin-bottom: 10px; border-radius: 8px;
          background: color-mix(in srgb, var(--err, #e5484d) 10%, transparent);
          color: var(--err, #e5484d); font-size: 13px;
        }
        .pbadm-empty { padding: 40px; text-align: center; opacity: 0.6; }
        .pbadm-select-all {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; margin-bottom: 8px; cursor: pointer;
        }
        .pbadm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }
        .pbadm-card {
          position: relative; border: 1px solid var(--border);
          border-radius: 10px; overflow: hidden; background: var(--panel);
          display: flex; flex-direction: column;
        }
        .pbadm-card.on { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
        .pbadm-pick { position: absolute; top: 6px; left: 6px; z-index: 2; background: rgba(0,0,0,0.5); border-radius: 4px; padding: 2px 4px; }
        .pbadm-pick input { cursor: pointer; }
        .pbadm-thumb { display: block; aspect-ratio: 4/5; background: #000; overflow: hidden; }
        .pbadm-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pbadm-meta { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; font-size: 11px; }
        .pbadm-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, monospace; font-size: 10px; opacity: 0.85; }
        .pbadm-row { display: flex; justify-content: space-between; opacity: 0.75; }
        .pbadm-ttl { color: var(--accent); }
        .pbadm-time { opacity: 0.6; font-size: 10px; }
        .pbadm-icons { display: flex; gap: 4px; margin-top: 4px; }
        .pbadm-icbtn {
          flex: 1; padding: 4px; border-radius: 6px; cursor: pointer;
          border: 1px solid var(--border); background: var(--bg); color: var(--text);
          display: inline-flex; align-items: center; justify-content: center;
        }
        .pbadm-icbtn:hover { border-color: var(--accent); }
        .pbadm-icbtn.danger:hover { border-color: var(--err, #e5484d); color: var(--err, #e5484d); }
        .pbadm-modal {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px;
        }
        .pbadm-dialog {
          background: var(--panel); border-radius: 12px; padding: 20px;
          max-width: 400px; width: 100%; border: 1px solid var(--border);
        }
        .pbadm-dialog h3 { margin: 0 0 8px; font-size: 16px; }
        .pbadm-dialog p { margin: 0 0 16px; font-size: 13px; opacity: 0.75; }
        .pbadm-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .spin { animation: pbadmSpin 1s linear infinite; }
        @keyframes pbadmSpin { to { transform: rotate(360deg); } }
      `}</style>
    </AdminBody>
  );
}
