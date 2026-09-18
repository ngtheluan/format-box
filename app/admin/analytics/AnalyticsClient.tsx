"use client";
import {
  IconChartBar,
  IconChartLine,
  IconEye,
  IconLayoutGrid,
  IconLoader2,
  IconRefresh,
  IconTools,
  IconTrophy,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useTools } from "@/components/ToolsProvider";
import { ToolIcon } from "@/lib/tool-icons";
import AdminBody from "../AdminBody";

type Analytics = {
  ok: boolean;
  days: number;
  total: number;
  toolCount: number;
  perTool: { href: string; count: number }[];
  series: { day: string; count: number }[];
};

const RANGES = [7, 30, 90] as const;

const nf = new Intl.NumberFormat("vi-VN");

function shortDay(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export default function AnalyticsClient() {
  const tools = useTools();
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const titleFor = useCallback(
    (href: string) => tools.find((t) => t.href === href),
    [tools],
  );

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
          <div className="fx-stat" data-tone="ok">
            <span className="fx-stat-ico">
              <IconTools size={18} stroke={1.8} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{nf.format(data?.toolCount ?? 0)}</span>
              <span className="fx-stat-lbl">Tool có lượt dùng</span>
            </span>
          </div>
          <div className="fx-stat" data-tone="mute">
            <span className="fx-stat-ico">
              <IconTrophy size={18} stroke={1.8} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val" style={{ fontSize: 15 }}>
                {topTools[0] ? titleFor(topTools[0].href)?.title ?? topTools[0].href : "—"}
              </span>
              <span className="fx-stat-lbl">Tool hot nhất</span>
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
            {loading ? (
              <IconLoader2 size={14} stroke={2} className="spin" />
            ) : (
              <IconRefresh size={14} stroke={2} />
            )}
            Tải lại
          </button>
        </div>
      }
    >
      {error && <div style={alertError}>{error}</div>}

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
const alertError: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.08)",
  color: "#ef4444",
  fontSize: 13,
};
