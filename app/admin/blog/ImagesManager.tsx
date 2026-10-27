"use client";
import { useToast } from "@/components/Toast";
import { IconCopy, IconExternalLink, IconLoader2, IconPhoto, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

type Blob = {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
};

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString("vi-VN", { hour12: false });
  } catch {
    return s;
  }
}

export default function ImagesManager() {
  const toast = useToast();
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Blob | null>(null);

  const load = useCallback(async (next?: string) => {
    const setLoad = next ? setLoadingMore : setLoading;
    setLoad(true);
    try {
      const qs = next ? `?cursor=${encodeURIComponent(next)}` : "";
      const r = await fetch(`/api/blog/images/manage${qs}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        toast(j.error || "Lỗi tải");
        return;
      }
      setBlobs((prev) => (next ? [...prev, ...j.blobs] : j.blobs));
      setCursor(j.cursor);
    } finally {
      setLoad(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(b: Blob) {
    setDeleting(b.url);
    try {
      const r = await fetch("/api/blog/images/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: b.url }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        toast(j.error || "Xoá lỗi");
        return;
      }
      setBlobs((prev) => prev.filter((x) => x.url !== b.url));
      toast("Đã xoá ảnh");
      setConfirmDel(null);
    } finally {
      setDeleting(null);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast("Đã copy URL");
    } catch {
      toast("Copy thất bại");
    }
  }

  const totalBytes = blobs.reduce((s, b) => s + b.size, 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          marginBottom: 10,
          fontSize: 12,
        }}
      >
        <IconPhoto size={14} stroke={1.9} style={{ color: "var(--accent)" }} />
        <b>{blobs.length}</b> ảnh · <b>{fmtSize(totalBytes)}</b>
        <div style={{ flex: 1 }} />
        <button className="fx-btn fx-btn-ghost" onClick={() => load()} disabled={loading}>
          {loading ? <IconLoader2 size={13} className="spin" /> : <IconRefresh size={13} />} Tải lại
        </button>
      </div>

      {loading && blobs.length === 0 ? (
        <div className="fx-empty">Đang tải…</div>
      ) : blobs.length === 0 ? (
        <div className="fx-empty">
          <div className="fx-empty-ico">
            <IconPhoto size={22} stroke={1.7} />
          </div>
          Chưa có ảnh nào. Ảnh upload từ &quot;Soạn thủ công&quot; sẽ hiện ở đây.
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
              gap: 10,
            }}
          >
            {blobs.map((b) => (
              <div
                key={b.url}
                style={{
                  background: "var(--fx-card, var(--bg2))",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    aspectRatio: "1 / 1",
                    background: `url(${b.url}) center/cover no-repeat, var(--bg3)`,
                  }}
                  title={b.pathname}
                />
                <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-mono, monospace)",
                      opacity: 0.75,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={b.pathname}
                  >
                    {b.pathname.replace(/^blog\//, "")}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.6, display: "flex", justifyContent: "space-between" }}>
                    <span>{fmtSize(b.size)}</span>
                    <span>{fmtDate(b.uploadedAt)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <button
                      className="fx-btn fx-btn-icon fx-btn-ghost"
                      onClick={() => copyUrl(b.url)}
                      title="Copy URL"
                      style={{ flex: 1 }}
                    >
                      <IconCopy size={13} stroke={1.9} />
                    </button>
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fx-btn fx-btn-icon fx-btn-ghost"
                      title="Mở"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <IconExternalLink size={13} stroke={1.9} />
                    </a>
                    <button
                      className="fx-btn fx-btn-icon fx-btn-danger"
                      onClick={() => setConfirmDel(b)}
                      title="Xoá"
                      disabled={deleting === b.url}
                      style={{ flex: 1 }}
                    >
                      {deleting === b.url ? <IconLoader2 size={13} className="spin" /> : <IconTrash size={13} stroke={1.9} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cursor && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <button className="fx-btn" onClick={() => load(cursor)} disabled={loadingMore}>
                {loadingMore ? <IconLoader2 size={13} className="spin" /> : null} Tải thêm
              </button>
            </div>
          )}
        </>
      )}

      {confirmDel && (
        <div className="fx-modal-bg" onClick={(e) => e.target === e.currentTarget && setConfirmDel(null)}>
          <div className="fx-modal" style={{ maxWidth: 420 }}>
            <div className="fx-modal-head">
              <h2>Xoá ảnh?</h2>
            </div>
            <div className="fx-modal-body" style={{ fontSize: 13 }}>
              Xoá vĩnh viễn <b>{confirmDel.pathname.replace(/^blog\//, "")}</b>?
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6 }}>
                Nếu ảnh đang được dùng trong bài viết, bài sẽ bị gãy ảnh.
              </div>
            </div>
            <div className="fx-modal-foot">
              <button className="fx-btn" onClick={() => setConfirmDel(null)}>
                Huỷ
              </button>
              <button
                className="fx-btn fx-btn-danger"
                onClick={() => remove(confirmDel)}
                disabled={deleting === confirmDel.url}
              >
                <IconTrash size={14} /> Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
