"use client";
import {
  IconCheck,
  IconExternalLink,
  IconHistory,
  IconLayoutGrid,
  IconLoader2,
  IconMail,
  IconMessageDots,
  IconRefresh,
  IconSend,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import AdminHeader from "../AdminHeader";
import "../admin.css";

type FeedbackItem = {
  row: number;
  timestamp: string;
  name: string;
  email: string;
  message: string;
  file: string;
  userAgent: string;
};

function formatTime(ts: string) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("vi-VN", { hour12: false });
}

const isUrl = (s: string) => /^https?:\/\//i.test(s);

type ReplyLog = { timestamp: string; email: string; subject: string; body: string };

const CACHE_KEY = "fx.admin.feedback.cache.v1";

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyRow, setBusyRow] = useState<number | null>(null);

  const [history, setHistory] = useState<FeedbackItem | null>(null);
  const [historyItems, setHistoryItems] = useState<ReplyLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [reply, setReply] = useState<FeedbackItem | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyStatus, setReplyStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [replyError, setReplyError] = useState("");

  const [confirmDel, setConfirmDel] = useState<FeedbackItem | null>(null);
  const [delStatus, setDelStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [delError, setDelError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/feedback/list", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.items || []);
      setReplyCounts(data.replyCounts || {});
      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ items: data.items || [], replyCounts: data.replyCounts || {} }),
        );
      } catch {}
    } catch (err: any) {
      setError(err?.message || "Không lấy được danh sách.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Hydrate từ sessionStorage cho lần load sau đỡ chờ
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const p = JSON.parse(cached);
        if (Array.isArray(p.items)) setItems(p.items);
        if (p.replyCounts) setReplyCounts(p.replyCounts);
      }
    } catch {}
    load();
  }, []);

  const openHistory = async (it: FeedbackItem) => {
    setHistory(it);
    setHistoryItems([]);
    setHistoryError("");
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/feedback/replies?email=${encodeURIComponent(it.email)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      setHistoryItems(data.items || []);
    } catch (err: any) {
      setHistoryError(err?.message || "Không tải được lịch sử.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    const it = confirmDel;
    const snapshot = items;
    // Optimistic: đóng modal + xóa khỏi UI ngay
    setItems((prev) => prev.filter((x) => x.row !== it.row));
    setConfirmDel(null);
    setDelStatus("idle");
    setBusyRow(it.row);
    try {
      const res = await fetch("/api/feedback/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", row: it.row }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
    } catch (err: any) {
      // Rollback + báo lỗi
      setItems(snapshot);
      setError("Xóa thất bại: " + (err?.message || "unknown"));
    } finally {
      setBusyRow(null);
    }
  };

  const openReply = (it: FeedbackItem) => {
    setReply(it);
    setReplySubject(`Phản hồi góp ý của bạn`);
    setReplyBody(`Chào ${it.name || "bạn"},\n\nCảm ơn bạn đã gửi góp ý:\n"${it.message}"\n\n---\n\n`);
    setReplyStatus("idle");
    setReplyError("");
  };

  const closeReply = () => {
    setReply(null);
    setReplyStatus("idle");
    setReplyError("");
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply || replyStatus === "sending") return;
    setReplyStatus("sending");
    setReplyError("");
    try {
      const res = await fetch("/api/feedback/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          row: reply.row,
          to: reply.email,
          subject: replySubject,
          body: replyBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      setReplyStatus("success");
      const key = reply.email.trim().toLowerCase();
      setReplyCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      setTimeout(closeReply, 1400);
    } catch (err: any) {
      setReplyStatus("error");
      setReplyError(err?.message || "Gửi email thất bại.");
    }
  };

  return (
    <div className="fx-scope fx-shell">
      <AdminHeader
        crumbs={[
          { label: "Dashboard", href: "/admin", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
          { label: "Liên hệ góp ý", icon: <IconMessageDots size={13} stroke={1.8} />, current: true },
        ]}
      />
      <div className="fx-body">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Liên hệ góp ý</h1>
            <p style={{ fontSize: 13, opacity: 0.62, marginTop: 4 }}>
              Danh sách góp ý đọc từ Google Sheet đã cấu hình. File đính kèm mở từ Drive.
            </p>
          </div>
          <button type="button" onClick={load} disabled={loading} style={btnGhost}>
            {loading ? <IconLoader2 size={14} stroke={2} className="spin" /> : <IconRefresh size={14} stroke={2} />}
            Tải lại
          </button>
        </div>

        {error && <div style={alertError}>{error}</div>}

        {!error && !loading && items.length === 0 && (
          <div
            style={{
              padding: 24,
              borderRadius: 12,
              border: "1px dashed var(--fx-border, rgba(0,0,0,0.12))",
              textAlign: "center",
              fontSize: 13,
              opacity: 0.7,
            }}
          >
            Chưa có góp ý nào.
          </div>
        )}

        {(items.length > 0 || loading) && (
          <div
            style={{
              position: "relative",
              overflowX: "auto",
              border: "1px solid var(--fx-border, rgba(0,0,0,0.08))",
              borderRadius: 12,
              background: "var(--fx-card, #fff)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1000 }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.04)", textAlign: "left" }}>
                  <th style={th}>Thời gian</th>
                  <th style={th}>Tên</th>
                  <th style={th}>Email</th>
                  <th style={{ ...th, minWidth: 320 }}>Nội dung</th>
                  <th style={th}>File</th>
                  <th style={{ ...th, width: 180 }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const replied = replyCounts[it.email.trim().toLowerCase()] || 0;
                  return (
                    <tr
                      key={it.row}
                      style={{
                        borderTop: "1px solid var(--fx-border, rgba(0,0,0,0.06))",
                        background: replied ? "color-mix(in srgb, #10b981 6%, transparent)" : "transparent",
                      }}
                    >
                      <td style={{ ...td, whiteSpace: "nowrap", opacity: 0.85 }}>
                        <span
                          title={replied ? "Đã trả lời" : "Chưa trả lời"}
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            marginRight: 8,
                            background: replied ? "#10b981" : "rgba(255,255,255,0.18)",
                            boxShadow: replied ? "0 0 0 3px rgba(16,185,129,0.18)" : "none",
                            verticalAlign: "middle",
                          }}
                        />
                        {formatTime(it.timestamp)}
                      </td>
                      <td style={td}>{it.name}</td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <a href={`mailto:${it.email}`} style={{ color: "var(--fx-accent, #f59e0b)" }}>
                            {it.email}
                          </a>
                          {replied > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "2px 7px",
                                borderRadius: 999,
                                background: "rgba(16,185,129,0.14)",
                                color: "#10b981",
                                border: "1px solid rgba(16,185,129,0.35)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <IconCheck size={10} stroke={2.5} /> Đã trả lời{replied > 1 ? ` ×${replied}` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, whiteSpace: "pre-wrap" }}>{it.message}</td>
                      <td style={td}>
                        {it.file ? (
                          isUrl(it.file) ? (
                            <a
                              href={it.file}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                color: "var(--fx-accent, #f59e0b)",
                              }}
                            >
                              Mở <IconExternalLink size={12} stroke={2} />
                            </a>
                          ) : (
                            <span style={{ opacity: 0.7 }}>{it.file}</span>
                          )
                        ) : (
                          <span style={{ opacity: 0.4 }}>—</span>
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => openReply(it)}
                            disabled={busyRow === it.row}
                            title="Trả lời qua email"
                            style={iconBtn}
                          >
                            <IconMail size={14} stroke={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openHistory(it)}
                            title={replied ? `Xem ${replied} phản hồi đã gửi` : "Chưa có phản hồi"}
                            disabled={!replied}
                            style={{
                              ...iconBtn,
                              opacity: replied ? 1 : 0.4,
                              cursor: replied ? "pointer" : "not-allowed",
                            }}
                          >
                            <IconHistory size={14} stroke={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDel(it);
                              setDelStatus("idle");
                              setDelError("");
                            }}
                            disabled={busyRow === it.row}
                            title="Xóa"
                            style={{ ...iconBtn, color: "#ef4444" }}
                          >
                            {busyRow === it.row ? (
                              <IconLoader2 size={14} stroke={2} className="spin" />
                            ) : (
                              <IconTrash size={14} stroke={2} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "color-mix(in srgb, var(--fx-card, #10151f) 70%, transparent)",
                  backdropFilter: "blur(2px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 13,
                  opacity: 0.9,
                  zIndex: 5,
                }}
              >
                <IconLoader2 size={16} stroke={2} className="spin" /> Đang tải danh sách...
              </div>
            )}
          </div>
        )}
      </div>

      {reply && (
        <div
          style={overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeReply();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div style={{ ...modal, maxWidth: 560 }} onMouseDown={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 2 }}>Trả lời qua email</div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{reply.email}</h3>
              </div>
              <button style={iconBtn} onClick={closeReply} aria-label="Đóng">
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <form style={modalBody} onSubmit={sendReply}>
              <label style={fieldWrap}>
                <span style={fieldLabel}>Tiêu đề</span>
                <input
                  style={fieldInput}
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  required
                  disabled={replyStatus === "sending" || replyStatus === "success"}
                />
              </label>
              <label style={fieldWrap}>
                <span style={fieldLabel}>Nội dung</span>
                <textarea
                  style={{ ...fieldInput, minHeight: 180, resize: "vertical", fontFamily: "inherit" }}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={8}
                  required
                  disabled={replyStatus === "sending" || replyStatus === "success"}
                />
              </label>

              {replyStatus === "error" && replyError && <div style={alertError}>{replyError}</div>}
              {replyStatus === "success" && (
                <div style={alertSuccess}>
                  <IconCheck size={14} stroke={2.4} /> Đã gửi email.
                </div>
              )}

              <div style={modalActions}>
                <button type="button" style={btnGhost} onClick={closeReply} disabled={replyStatus === "sending"}>
                  Huỷ
                </button>
                <button
                  type="submit"
                  style={btnPrimary}
                  disabled={replyStatus === "sending" || replyStatus === "success"}
                >
                  {replyStatus === "sending" ? (
                    <>
                      <IconLoader2 size={14} stroke={2.2} className="spin" /> Đang gửi...
                    </>
                  ) : (
                    <>
                      <IconSend size={14} stroke={2.2} /> Gửi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDel && (
        <div
          style={overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && delStatus !== "deleting") setConfirmDel(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div style={{ ...modal, maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ ...modalBody, gap: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(239,68,68,0.12)",
                    color: "#ef4444",
                    flexShrink: 0,
                  }}
                >
                  <IconTrash size={18} stroke={2} />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Xóa góp ý?</h3>
                  <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.72, lineHeight: 1.5 }}>
                    Sẽ xóa vĩnh viễn góp ý từ <strong>{confirmDel.name || confirmDel.email}</strong> khỏi Google Sheet.
                    Không thể hoàn tác.
                  </p>
                </div>
              </div>

              {delStatus === "error" && delError && <div style={alertError}>{delError}</div>}

              <div style={modalActions}>
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() => setConfirmDel(null)}
                  disabled={delStatus === "deleting"}
                >
                  Huỷ
                </button>
                <button type="button" style={btnDanger} onClick={confirmDelete} disabled={delStatus === "deleting"}>
                  {delStatus === "deleting" ? (
                    <>
                      <IconLoader2 size={14} stroke={2.2} className="spin" /> Đang xóa...
                    </>
                  ) : (
                    <>
                      <IconTrash size={14} stroke={2.2} /> Xóa
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {history && (
        <div
          style={overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setHistory(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div style={{ ...modal, maxWidth: 640 }} onMouseDown={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 2 }}>Lịch sử phản hồi</div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{history.email}</h3>
              </div>
              <button style={iconBtn} onClick={() => setHistory(null)} aria-label="Đóng">
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div style={{ ...modalBody, gap: 10 }}>
              {historyLoading && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, fontSize: 13, opacity: 0.85 }}
                >
                  <IconLoader2 size={14} stroke={2} className="spin" /> Đang tải...
                </div>
              )}
              {historyError && <div style={alertError}>{historyError}</div>}
              {!historyLoading && !historyError && historyItems.length === 0 && (
                <div style={{ padding: 12, fontSize: 13, opacity: 0.65, textAlign: "center" }}>
                  Chưa có phản hồi nào.
                </div>
              )}
              {historyItems.map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid var(--fx-border, rgba(255,255,255,0.08))",
                    background: "color-mix(in srgb, currentColor 4%, transparent)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <strong style={{ fontSize: 13 }}>{r.subject}</strong>
                    <span style={{ fontSize: 11, opacity: 0.6, whiteSpace: "nowrap" }}>{formatTime(r.timestamp)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap", opacity: 0.85, lineHeight: 1.5 }}>{r.body}</div>
                </div>
              ))}
              <div style={modalActions}>
                <button type="button" style={btnGhost} onClick={() => setHistory(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  opacity: 0.7,
};
const td: React.CSSProperties = { padding: "10px 12px", verticalAlign: "top" };

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--fx-border, rgba(0,0,0,0.08))",
  background: "var(--fx-card, #fff)",
  cursor: "pointer",
  color: "inherit",
  fontSize: 13,
};

const iconBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid var(--fx-border, rgba(0,0,0,0.1))",
  background: "transparent",
  cursor: "pointer",
  color: "inherit",
};

const alertError: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.08)",
  color: "#ef4444",
  fontSize: 13,
};

const alertSuccess: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(16,185,129,0.35)",
  background: "rgba(16,185,129,0.10)",
  color: "#10b981",
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(4, 8, 15, 0.68)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
  animation: "fxFadeIn 0.15s ease",
};

const modal: React.CSSProperties = {
  width: "100%",
  maxHeight: "92vh",
  overflow: "auto",
  background: "var(--fx-card, #10151f)",
  color: "inherit",
  borderRadius: 14,
  border: "1px solid var(--fx-border, rgba(255,255,255,0.08))",
  boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)",
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  padding: "16px 18px",
  borderBottom: "1px solid var(--fx-border, rgba(255,255,255,0.06))",
};

const modalBody: React.CSSProperties = {
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const modalActions: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 4,
};

const fieldWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  opacity: 0.72,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--fx-border, rgba(255,255,255,0.12))",
  background: "color-mix(in srgb, currentColor 6%, transparent)",
  color: "inherit",
  fontSize: 13.5,
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid var(--fx-accent, #f59e0b)",
  background: "var(--fx-accent, #f59e0b)",
  color: "#0a0e15",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid #ef4444",
  background: "#ef4444",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
