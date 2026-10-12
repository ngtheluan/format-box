"use client";
import { useTools } from "@/components/ToolsProvider";
import { ToolIcon } from "@/lib/tool-icons";
import {
  IconChartBar,
  IconChartLine,
  IconExternalLink,
  IconEye,
  IconGauge,
  IconLayoutGrid,
  IconLoader2,
  IconMapPin,
  IconRefresh,
  IconTrophy,
  IconUsers,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import AdminBody from "../AdminBody";

type Analytics = {
  ok: boolean;
  days: number;
  total: number;
  toolCount: number;
  perTool: { href: string; count: number }[];
  series: { day: string; count: number }[];
};

type EventRow = {
  id: number;
  href: string;
  ip: string | null;
  ua: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  referer: string | null;
  lang: string | null;
  created_at: string;
};

type RecentData = {
  ok: boolean;
  rows: EventRow[];
  uniqueIps: number;
  countries: { code: string; count: number }[];
};

const RANGES = [7, 30, 90] as const;

const nf = new Intl.NumberFormat("vi-VN");

function shortDay(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}p`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function shortUA(ua: string | null): string {
  if (!ua) return "—";
  const u = ua.toLowerCase();
  const os =
    u.includes("iphone") || u.includes("ios")
      ? "iOS"
      : u.includes("android")
        ? "Android"
        : u.includes("mac os")
          ? "macOS"
          : u.includes("windows")
            ? "Windows"
            : u.includes("linux")
              ? "Linux"
              : "Other";
  const br = u.includes("edg/")
    ? "Edge"
    : u.includes("chrome/") && !u.includes("edg/")
      ? "Chrome"
      : u.includes("firefox/")
        ? "Firefox"
        : u.includes("safari/") && !u.includes("chrome/")
          ? "Safari"
          : "Web";
  return `${br} · ${os}`;
}

function flag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const up = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(up)) return "";
  const base = 0x1f1e6;
  const A = "A".charCodeAt(0);
  return String.fromCodePoint(base + up.charCodeAt(0) - A, base + up.charCodeAt(1) - A);
}

export default function AnalyticsClient() {
  const tools = useTools();
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<RecentData | null>(null);
  const [recentLoading, setRecentLoading] = useState(false);
  const [filterHref, setFilterHref] = useState<string>("");
  const [filterIp, setFilterIp] = useState<string>("");

  const titleFor = useCallback((href: string) => tools.find((t) => t.href === href), [tools]);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.error || `HTTP ${res.status}`);
      setData(j);
    } catch (err: any) {
      setError(err?.message || "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const loadRecent = useCallback(async (href: string, ip: string) => {
    setRecentLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "100" });
      if (href) qs.set("href", href);
      if (ip) qs.set("ip", ip);
      const res = await fetch(`/api/admin/analytics/recent?${qs}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok !== false) setRecent(j);
    } catch {
      /* best-effort */
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecent(filterHref, filterIp);
  }, [filterHref, filterIp, loadRecent]);

  const maxSeries = Math.max(1, ...(data?.series.map((s) => s.count) ?? [0]));
  const maxTool = Math.max(1, ...(data?.perTool.map((t) => t.count) ?? [0]));
  const topTools = data?.perTool.slice(0, 15) ?? [];
  const avgPerDay = data && data.days ? Math.round(data.total / data.days) : 0;

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", href: "/admin", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
        { label: "Thống kê", icon: <IconChartBar size={13} stroke={1.8} />, current: true },
      ]}
      stats={
        <>
          <div className="fx-stat">
            <span className="fx-stat-ico">
              <IconEye size={18} stroke={1.8} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{nf.format(data?.total ?? 0)}</span>
              <span className="fx-stat-lbl">Lượt dùng ({days} ngày)</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="info">
            <span className="fx-stat-ico">
              <IconChartLine size={18} stroke={1.8} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{nf.format(avgPerDay)}</span>
              <span className="fx-stat-lbl">Trung bình / ngày</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="mute">
            <span className="fx-stat-ico">
              <IconTrophy size={18} stroke={1.8} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val" style={{ fontSize: 15 }}>
                {topTools[0] ? (titleFor(topTools[0].href)?.title ?? topTools[0].href) : "—"}
              </span>
              <span className="fx-stat-lbl">Tool hot nhất</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="info">
            <span className="fx-stat-ico">
              <IconUsers size={18} stroke={1.8} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{nf.format(recent?.uniqueIps ?? 0)}</span>
              <span className="fx-stat-lbl">IP duy nhất (gần đây)</span>
            </span>
          </div>
        </>
      }
      title="Thống kê sử dụng"
      description="Lượt truy cập từng tool. Dữ liệu ghi nhận khi người dùng mở trang tool."
      titleActions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={rangeWrap}>
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                style={{ ...rangeBtn, ...(days === r ? rangeBtnActive : null) }}
              >
                {r} ngày
              </button>
            ))}
          </div>
          <button type="button" onClick={() => load(days)} disabled={loading} style={btnGhost}>
            {loading ? <IconLoader2 size={14} stroke={2} className="spin" /> : <IconRefresh size={14} stroke={2} />}
            Tải lại
          </button>
        </div>
      }
    >
      {error && <div style={alertError}>{error}</div>}

      <div style={vercelNote}>
        <IconGauge size={14} stroke={1.8} />
        <span style={{ flex: 1 }}>
          Số liệu dưới đây lấy từ DB nội bộ. Pageviews & Web Vitals chi tiết xem ở Vercel.
        </span>
        <a href="https://vercel.com/dashboard/analytics" target="_blank" rel="noreferrer" style={vercelLink}>
          Vercel Analytics <IconExternalLink size={12} stroke={2} />
        </a>
        <a href="https://vercel.com/dashboard/speed-insights" target="_blank" rel="noreferrer" style={vercelLink}>
          Speed Insights <IconExternalLink size={12} stroke={2} />
        </a>
      </div>

      {!error && (
        <div style={{ display: "grid", gap: 14 }}>
          {/* Daily trend */}
          <div style={panel}>
            <div style={panelHead}>
              <IconChartLine size={15} stroke={2} />
              <span>Lượt dùng theo ngày</span>
            </div>
            {data && data.series.length > 0 ? (
              <div style={chartWrap}>
                {data.series.map((s) => (
                  <div key={s.day} style={barCol} title={`${shortDay(s.day)}: ${nf.format(s.count)}`}>
                    <div style={{ ...barTrack }}>
                      <div
                        style={{
                          ...barFill,
                          height: `${(s.count / maxSeries) * 100}%`,
                          opacity: s.count ? 1 : 0.25,
                        }}
                      />
                    </div>
                    {data.series.length <= 31 && <span style={barLbl}>{shortDay(s.day)}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyBox}>{loading ? "Đang tải..." : "Chưa có dữ liệu."}</div>
            )}
          </div>

          {/* Top tools */}
          <div style={panel}>
            <div style={panelHead}>
              <IconTrophy size={15} stroke={2} />
              <span>Top tool được dùng nhiều</span>
            </div>
            {topTools.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {topTools.map((t, i) => {
                  const tool = titleFor(t.href);
                  const pct = data ? Math.round((t.count / data.total) * 100) : 0;
                  return (
                    <div key={t.href} style={rankRow}>
                      <span style={rankNum}>{i + 1}</span>
                      <span style={rankIco}>
                        <ToolIcon name={tool?.iconName ?? "tool"} size={16} stroke={1.8} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={rankTop}>
                          <span style={rankName}>{tool?.title ?? t.href}</span>
                          <span style={rankCount}>
                            {nf.format(t.count)} <small style={{ opacity: 0.55 }}>· {pct}%</small>
                          </span>
                        </div>
                        <div style={rankBarTrack}>
                          <div style={{ ...rankBarFill, width: `${(t.count / maxTool) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={emptyBox}>{loading ? "Đang tải..." : "Chưa có dữ liệu."}</div>
            )}
          </div>

          {/* Visitors / recent events */}
          <div style={panel}>
            <div style={{ ...panelHead, justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <IconMapPin size={15} stroke={2} />
                <span>Lượt truy cập gần đây (IP · UA · Geo)</span>
              </span>
              <span
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  textTransform: "none",
                  letterSpacing: 0,
                  opacity: 1,
                }}
              >
                {(filterHref || filterIp) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterHref("");
                      setFilterIp("");
                    }}
                    style={filterChip}
                  >
                    <IconX size={11} stroke={2} /> Bỏ lọc
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loadRecent(filterHref, filterIp)}
                  disabled={recentLoading}
                  style={filterChip}
                >
                  {recentLoading ? (
                    <IconLoader2 size={11} stroke={2} className="spin" />
                  ) : (
                    <IconRefresh size={11} stroke={2} />
                  )}
                  Tải lại
                </button>
              </span>
            </div>

            {recent && recent.countries.length > 0 && (
              <div style={countryStrip}>
                <IconWorld size={13} stroke={2} style={{ opacity: 0.5 }} />
                {recent.countries.slice(0, 8).map((c) => {
                  const f = flag(c.code);
                  const label = f ? c.code : "N/A";
                  return (
                    <span key={c.code} style={countryChip} title={f ? c.code : "Không xác định (localhost / proxy)"}>
                      {f && <span>{f}</span>}
                      <span style={{ fontWeight: 600 }}>{label}</span>
                      <span style={{ opacity: 0.6 }}>{nf.format(c.count)}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {(filterHref || filterIp) && (
              <div style={filterBar}>
                <span style={{ opacity: 0.6 }}>Đang lọc:</span>
                {filterHref && (
                  <span style={activeFilter}>
                    tool: <b>{titleFor(filterHref)?.title ?? filterHref}</b>
                  </span>
                )}
                {filterIp && (
                  <span style={activeFilter}>
                    ip: <b>{filterIp}</b>
                  </span>
                )}
              </div>
            )}

            {recent && recent.rows.length > 0 ? (
              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Thời gian</th>
                      <th style={th}>Tool</th>
                      <th style={th}>IP</th>
                      <th style={th}>Vị trí</th>
                      <th style={th}>Thiết bị</th>
                      <th style={th}>Ngôn ngữ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.rows.map((r) => {
                      const tool = titleFor(r.href);
                      return (
                        <tr key={r.id} style={tr}>
                          <td style={td} title={new Date(r.created_at).toLocaleString("vi-VN")}>
                            {timeAgo(r.created_at)}
                          </td>
                          <td style={td}>
                            <button
                              type="button"
                              onClick={() => setFilterHref(r.href)}
                              style={cellLink}
                              title="Lọc theo tool"
                            >
                              {tool?.title ?? r.href}
                            </button>
                          </td>
                          <td style={td}>
                            {r.ip ? (
                              <button
                                type="button"
                                onClick={() => setFilterIp(r.ip!)}
                                style={cellLink}
                                title="Lọc theo IP"
                              >
                                {r.ip}
                              </button>
                            ) : (
                              <span style={{ opacity: 0.4 }}>—</span>
                            )}
                          </td>
                          <td style={td}>
                            {r.country ? (
                              <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                                {flag(r.country) && <span>{flag(r.country)}</span>}
                                <span>{[r.city, r.region, r.country].filter(Boolean).join(", ")}</span>
                              </span>
                            ) : (
                              <span style={{ opacity: 0.4 }}>—</span>
                            )}
                          </td>
                          <td style={td} title={r.ua ?? ""}>
                            {shortUA(r.ua)}
                          </td>
                          <td style={td}>
                            <span style={{ opacity: 0.75 }}>{r.lang ?? "—"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={emptyBox}>{recentLoading ? "Đang tải..." : "Chưa có dữ liệu."}</div>
            )}
          </div>
        </div>
      )}
    </AdminBody>
  );
}

const panel: React.CSSProperties = {
  border: "1px solid var(--fx-border, rgba(255,255,255,0.08))",
  borderRadius: 12,
  background: "var(--fx-card, #10151f)",
  padding: 14,
};
const panelHead: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12.5,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  opacity: 0.72,
  marginBottom: 12,
};
const chartWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 3,
  height: 160,
  overflowX: "auto",
};
const barCol: React.CSSProperties = {
  flex: "1 0 8px",
  minWidth: 8,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  height: "100%",
};
const barTrack: React.CSSProperties = {
  flex: 1,
  width: "100%",
  display: "flex",
  alignItems: "flex-end",
  minHeight: 0,
};
const barFill: React.CSSProperties = {
  width: "100%",
  minHeight: 2,
  borderRadius: "3px 3px 0 0",
  background: "var(--fx-accent, #f59e0b)",
};
const barLbl: React.CSSProperties = {
  fontSize: 9.5,
  opacity: 0.5,
  whiteSpace: "nowrap",
};
const rankRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const rankNum: React.CSSProperties = {
  width: 20,
  textAlign: "center",
  fontSize: 12,
  fontWeight: 700,
  opacity: 0.5,
  flexShrink: 0,
};
const rankIco: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  background: "var(--fx-accent-soft, rgba(245,158,11,0.14))",
  color: "var(--fx-accent, #f59e0b)",
  flexShrink: 0,
};
const rankTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 4,
};
const rankName: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const rankCount: React.CSSProperties = { fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" };
const rankBarTrack: React.CSSProperties = {
  height: 6,
  borderRadius: 999,
  background: "rgba(148,163,184,0.14)",
  overflow: "hidden",
};
const rankBarFill: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "var(--fx-accent, #f59e0b)",
};
const emptyBox: React.CSSProperties = {
  padding: 24,
  textAlign: "center",
  fontSize: 13,
  opacity: 0.6,
};
const rangeWrap: React.CSSProperties = {
  display: "inline-flex",
  padding: 3,
  gap: 2,
  borderRadius: 9,
  border: "1px solid var(--fx-border, rgba(255,255,255,0.1))",
  background: "var(--fx-card, #10151f)",
};
const rangeBtn: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: "inherit",
  fontSize: 12.5,
  cursor: "pointer",
  opacity: 0.7,
};
const rangeBtnActive: React.CSSProperties = {
  background: "var(--fx-accent, #f59e0b)",
  color: "#0a0e15",
  fontWeight: 600,
  opacity: 1,
};
const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--fx-border, rgba(255,255,255,0.1))",
  background: "var(--fx-card, #10151f)",
  cursor: "pointer",
  color: "inherit",
  fontSize: 13,
};
const tableWrap: React.CSSProperties = {
  overflowX: "auto",
  margin: "0 -14px -14px",
  padding: "0 14px 10px",
};
const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12.5,
};
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  opacity: 0.55,
  borderBottom: "1px solid var(--fx-border, rgba(255,255,255,0.08))",
  whiteSpace: "nowrap",
};
const tr: React.CSSProperties = {
  borderBottom: "1px solid rgba(148,163,184,0.06)",
};
const td: React.CSSProperties = {
  padding: "6px 8px",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};
const cellLink: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--fx-accent, #f59e0b)",
  cursor: "pointer",
  padding: 0,
  fontSize: "inherit",
  textAlign: "left",
};
const countryStrip: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
  marginBottom: 10,
};
const countryChip: React.CSSProperties = {
  display: "inline-flex",
  gap: 5,
  alignItems: "center",
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(148,163,184,0.08)",
  fontSize: 11.5,
};
const filterChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px solid var(--fx-border, rgba(255,255,255,0.12))",
  background: "transparent",
  color: "inherit",
  fontSize: 11,
  cursor: "pointer",
};
const filterBar: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
  marginBottom: 10,
  fontSize: 11.5,
};
const activeFilter: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 999,
  background: "var(--fx-accent-soft, rgba(245,158,11,0.14))",
  color: "var(--fx-accent, #f59e0b)",
};
const vercelNote: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid var(--fx-border, rgba(255,255,255,0.08))",
  background: "var(--fx-card, #10151f)",
  fontSize: 12.5,
  opacity: 0.9,
};
const vercelLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px solid var(--fx-border, rgba(255,255,255,0.12))",
  color: "inherit",
  textDecoration: "none",
  fontSize: 11.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const alertError: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.08)",
  color: "#ef4444",
  fontSize: 13,
};
