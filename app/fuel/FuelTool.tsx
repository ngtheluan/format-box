"use client";
import { Alert, Badge, Button, Card, Skeleton } from "@/components/ui";
import { FALLBACK_SNAPSHOT, type FuelHistory, type FuelItem, type FuelKind, type FuelSnapshot } from "@/lib/fuel";
import { useI18n } from "@/lib/i18n";
import { IconArrowDown, IconArrowUp, IconExternalLink, IconGasStation, IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";

const KIND_COLOR: Record<FuelKind, string> = {
  e10_ron95: "#6366f1",
  e5_ron92: "#34d399",
  diesel: "#fbbf24",
  kerosene: "#f472b6",
  mazut: "#a78bfa",
};

const KIND_KEY: Record<
  FuelKind,
  "fp_kind_e10" | "fp_kind_e5" | "fp_kind_diesel" | "fp_kind_kerosene" | "fp_kind_mazut"
> = {
  e10_ron95: "fp_kind_e10",
  e5_ron92: "fp_kind_e5",
  diesel: "fp_kind_diesel",
  kerosene: "fp_kind_kerosene",
  mazut: "fp_kind_mazut",
};

function fmtVND(n: number) {
  return n.toLocaleString("vi-VN");
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", { hour12: false });
  } catch {
    return iso;
  }
}

function FuelHistoryChart({ history }: { history: FuelHistory }) {
  const { t } = useI18n();
  const W = 760;
  const H = 300;
  const P = { top: 20, right: 24, bottom: 56, left: 68 };
  const chartW = W - P.left - P.right;
  const chartH = H - P.top - P.bottom;

  const points = history.points;
  const kinds = Array.from(new Set(points.flatMap((p) => p.items.map((i) => i.kind))));
  const [hiddenKinds, setHiddenKinds] = useState<Set<FuelKind>>(new Set());
  const [hoverKind, setHoverKind] = useState<FuelKind | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(history.points.length - 1);

  // Clamp selectedIdx when points array shrinks (e.g. after refresh with fewer items)
  useEffect(() => {
    if (selectedIdx !== null && selectedIdx >= history.points.length) {
      setSelectedIdx(history.points.length - 1);
    }
  }, [history.points.length, selectedIdx]);
  const activeKinds = kinds.filter((k) => !hiddenKinds.has(k));
  const noneActive = activeKinds.length === 0;

  const toggle = (k: FuelKind) =>
    setHiddenKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const reset = () => setHiddenKinds(new Set());
  const soloValues = kinds.length > 0 ? points.flatMap((p) => p.items.map((i) => i.price)) : [];
  const allValues = noneActive
    ? soloValues
    : points.flatMap((p) => p.items.filter((i) => activeKinds.includes(i.kind)).map((i) => i.price));

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || max;
  const yMin = Math.max(0, min - range * 0.1);
  const yMax = max + range * 0.1;
  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks);

  const x = (i: number) => P.left + (points.length === 1 ? chartW / 2 : (i * chartW) / (points.length - 1));
  const y = (v: number) => P.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  // X-axis: per-point date labels ("d/M") — thin every other one when crowded
  const showEvery = points.length > 8 ? 2 : 1;
  const dateLabels = points
    .map((p, i) => ({ i, date: new Date(p.date) }))
    .filter(({ i }) => i % showEvery === 0 || i === points.length - 1);

  // Vertical month grid: dashed line at first point of each month
  const monthLines: number[] = [];
  let lastMonth = "";
  points.forEach((p, i) => {
    const d = new Date(p.date);
    const mo = `${d.getFullYear()}-${d.getMonth()}`;
    if (mo !== lastMonth) {
      monthLines.push(i);
      lastMonth = mo;
    }
  });

  // Compact latest price per kind (for legend badge)
  const latestByKind = new Map<FuelKind, number>();
  kinds.forEach((k) => {
    const last = [...points].reverse().find((p) => p.items.some((i) => i.kind === k));
    if (last) latestByKind.set(k, last.items.find((i) => i.kind === k)!.price);
  });

  return (
    <Card padding="md" variant="outline" className="fp-chart fp-hchart">
      <div className="fp-chart-head">
        <h3 className="fp-chart-title">{t("fp_chart_history_title")}</h3>
        <div className="fp-legend">
          {kinds.map((k) => {
            const on = !hiddenKinds.has(k);
            // const price = latestByKind.get(k);
            return (
              <button
                key={k}
                type="button"
                className={`fp-legend-item${on ? " on" : ""}`}
                onClick={() => toggle(k)}
                onMouseEnter={() => setHoverKind(k)}
                onMouseLeave={() => setHoverKind(null)}
                style={{ ["--fp-color" as string]: KIND_COLOR[k] }}
                title={t(KIND_KEY[k])}
              >
                <span className="fp-legend-dot" />
                <span className="fp-legend-name">{t(KIND_KEY[k])}</span>
                {/* {price !== undefined && <span className="fp-legend-price">{fmtVND(price)}đ</span>} */}
              </button>
            );
          })}
          {hiddenKinds.size > 0 && (
            <button type="button" className="fp-legend-reset" onClick={reset}>
              ↺ {t("fp_chart_reset_short")}
            </button>
          )}
        </div>
      </div>

      {noneActive ? (
        <div className="fp-empty">
          <p>{t("fp_chart_empty_msg")}</p>
          <Button size="sm" onClick={reset} leftIcon={<IconRefresh size={14} stroke={1.9} />}>
            {t("fp_chart_reset")}
          </Button>
        </div>
      ) : (
        <div className={`fp-chart-layout${selectedIdx === null ? " fp-chart-layout--solo" : ""}`}>
          <div className="fp-chart-svg-wrap">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="fp-chart-svg"
              role="img"
              aria-label={t("fp_chart_history_aria")}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {activeKinds.map((k) => (
                  <linearGradient key={k} id={`fp-area-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={KIND_COLOR[k]} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={KIND_COLOR[k]} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>

              {/* Y grid — labels in full "đồng" */}
              {tickValues.map((v, i) => {
                const yy = y(v);
                return (
                  <g key={i} className="fp-grid-line">
                    <line x1={P.left} x2={W - P.right} y1={yy} y2={yy} />
                    <text x={P.left - 8} y={yy + 4} textAnchor="end" className="fp-y-label">
                      {fmtVND(Math.round(v))}đ
                    </text>
                  </g>
                );
              })}

              {/* Month vertical dashed lines */}
              {monthLines.map((i) => (
                <line
                  key={`m-${i}`}
                  x1={x(i)}
                  x2={x(i)}
                  y1={P.top}
                  y2={P.top + chartH}
                  stroke="var(--border)"
                  strokeDasharray="2 3"
                />
              ))}

              {/* Selected marker vertical guide line */}
              {selectedIdx !== null && (
                <line
                  x1={x(selectedIdx)}
                  x2={x(selectedIdx)}
                  y1={P.top}
                  y2={P.top + chartH}
                  stroke="var(--accent)"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />
              )}

              {/* X-axis: per-point date labels, rotated */}
              {dateLabels.map(({ i, date }) => (
                <text
                  key={`d-${i}`}
                  x={x(i)}
                  y={H - P.bottom + 16}
                  textAnchor="end"
                  transform={`rotate(-38 ${x(i)} ${H - P.bottom + 16})`}
                  className="fp-x-label"
                >
                  {`${date.getDate()}/${date.getMonth() + 1}`}
                </text>
              ))}
              {/* Month tags along X-axis bottom-left corner */}
              <text x={P.left} y={H - 6} className="fp-x-month">
                {(() => {
                  const first = new Date(points[0].date);
                  const last = new Date(points[points.length - 1].date);
                  return `T${first.getMonth() + 1}/${first.getFullYear() % 100} → T${last.getMonth() + 1}/${last.getFullYear() % 100}`;
                })()}
              </text>

              {/* Lines + area per fuel */}
              {activeKinds.map((k) => {
                const pts = points
                  .map((p, i) => {
                    const it = p.items.find((it) => it.kind === k);
                    return it ? { i, x: x(i), y: y(it.price), price: it.price } : null;
                  })
                  .filter((v): v is { i: number; x: number; y: number; price: number } => v !== null);
                if (pts.length === 0) return null;
                const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                const areaPath =
                  `${linePath} L ${pts[pts.length - 1].x} ${P.top + chartH}` + ` L ${pts[0].x} ${P.top + chartH} Z`;
                const dimmed = hoverKind !== null && hoverKind !== k;
                return (
                  <g
                    key={k}
                    className={`fp-line-group${dimmed ? " fp-line-group--dim" : ""}${
                      hoverKind === k ? " fp-line-group--hi" : ""
                    }`}
                    onMouseEnter={() => setHoverKind(k)}
                    onMouseLeave={() => setHoverKind(null)}
                  >
                    <path d={areaPath} fill={`url(#fp-area-${k})`} className="fp-line-area" />
                    <path
                      d={linePath}
                      fill="none"
                      stroke={KIND_COLOR[k]}
                      strokeWidth={hoverKind === k ? 3 : 2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {pts.map((p, i) => {
                      const isSelected = selectedIdx === p.i;
                      const isLast = i === pts.length - 1;
                      const r = isSelected ? 7 : isLast ? 4.5 : 3.2;
                      return (
                        <g key={i}>
                          {/* Invisible larger hit target */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={14}
                            fill="transparent"
                            className="fp-dot-hit"
                            onClick={() => setSelectedIdx(p.i)}
                          />
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={r}
                            fill={isSelected ? KIND_COLOR[k] : "var(--bg2)"}
                            stroke={KIND_COLOR[k]}
                            strokeWidth={isSelected ? 2.4 : isLast ? 2.4 : 1.8}
                            className="fp-dot"
                            pointerEvents="none"
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
          {selectedIdx !== null &&
            (() => {
              const p = points[selectedIdx];
              if (!p) return null;
              const dt = new Date(p.date);
              const activeItems = p.items.filter((it) => activeKinds.includes(it.kind));
              return (
                <aside className="fp-details">
                  <div className="fp-details-head">
                    <div className="fp-details-date">
                      {dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </div>
                  </div>
                  <ul className="fp-details-list">
                    {activeItems.map((it) => (
                      <li key={it.kind} style={{ ["--fp-color" as string]: KIND_COLOR[it.kind] }}>
                        <span className="fp-details-dot" />
                        <span className="fp-details-name">{t(KIND_KEY[it.kind])}</span>
                        <b className="fp-details-price">
                          {fmtVND(it.price)}
                          <em>đ/{it.unit}</em>
                        </b>
                      </li>
                    ))}
                  </ul>
                </aside>
              );
            })()}
        </div>
      )}
    </Card>
  );
}

export default function FuelTool() {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<FuelSnapshot | null>(null);
  const [history, setHistory] = useState<FuelHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setErr(null);
    try {
      const [snapRes, histRes] = await Promise.all([
        fetch("/api/fuel", { cache: "no-store", signal }),
        fetch("/api/fuel/history", { signal }),
      ]);
      if (!snapRes.ok) throw new Error(`HTTP ${snapRes.status}`);
      const snap: FuelSnapshot = await snapRes.json();
      setSnapshot(snap);
      if (histRes.ok) {
        const hist: FuelHistory = await histRes.json();
        setHistory(hist);
      }
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setErr(e instanceof Error ? e.message : "unknown");
      setSnapshot(FALLBACK_SNAPSHOT);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, []);

  const data = snapshot ?? FALLBACK_SNAPSHOT;
  const items: FuelItem[] = data.items;
  const isFallback = data.source === "fallback";

  return (
    <div className="fp-tool">
      <div className="fp-head">
        <div className="fp-head-info">
          <Badge variant="dot" tone={isFallback ? "warning" : "success"}>
            {isFallback ? t("fp_mode_fallback") : t("fp_mode_live")}
          </Badge>
          {data.articleTitle && (
            <a href={data.articleUrl} target="_blank" rel="noreferrer" className="fp-src-link">
              {data.articleTitle} <IconExternalLink size={12} />
            </a>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => load()}
          loading={loading}
          leftIcon={!loading ? <IconRefresh size={14} stroke={1.9} /> : undefined}
        >
          {t("fp_refresh")}
        </Button>
      </div>

      {isFallback && !loading && (
        <Alert tone="warning" title={t("fp_stale_title")}>
          {data.note ?? t("fp_stale_msg")}
        </Alert>
      )}
      {err && !isFallback && (
        <Alert tone="danger" title={t("fp_err_title")}>
          {err}
        </Alert>
      )}

      <div className="fp-grid">
        {loading && !snapshot
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} padding="md" variant="outline" className="fp-card">
                <Skeleton width={80} height={18} />
                <div style={{ margin: "10px 0 6px" }}>
                  <Skeleton width={140} height={32} />
                </div>
                <Skeleton width={120} height={12} />
              </Card>
            ))
          : items.map((it) => {
              const up = (it.change ?? 0) > 0;
              const down = (it.change ?? 0) < 0;
              return (
                <Card
                  key={it.kind}
                  padding="md"
                  variant="outline"
                  className="fp-card"
                  style={{ ["--fp-color" as string]: KIND_COLOR[it.kind] }}
                >
                  <div className="fp-card-head">
                    <Badge variant="soft" tone="neutral" className="fp-badge">
                      <IconGasStation size={12} />
                      {t(KIND_KEY[it.kind])}
                    </Badge>
                    {it.change !== undefined && it.change !== 0 && (
                      <span className={`fp-change ${up ? "up" : "down"}`}>
                        {up ? <IconArrowUp size={12} stroke={2.4} /> : <IconArrowDown size={12} stroke={2.4} />}
                        {fmtVND(Math.abs(it.change))}
                      </span>
                    )}
                  </div>
                  <div className="fp-name">{it.name}</div>
                  <div className="fp-price">
                    <b>{fmtVND(it.price)}</b>
                    <span>đ/{it.unit}</span>
                  </div>
                </Card>
              );
            })}
      </div>

      {history && history.points.length >= 2 && <FuelHistoryChart history={history} />}

      <div className="fp-meta">
        <span className="fp-meta-item">
          {t("fp_source")}:{" "}
          <a href="https://vnexpress.net/chu-de/gia-xang-dau-1409" target="_blank" rel="noreferrer">
            VnExpress
          </a>
        </span>
        {data.publishedAt && (
          <span className="fp-meta-item">
            {t("fp_published")}: <b>{fmtDateTime(data.publishedAt)}</b>
          </span>
        )}
        <span className="fp-meta-item">
          {t("fp_fetched")}: <b>{fmtDateTime(data.fetchedAt)}</b>
        </span>
      </div>
    </div>
  );
}
