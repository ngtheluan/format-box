"use client";
import { Alert, Badge, Button, Card, Skeleton } from "@/components/ui";
import { FALLBACK_SNAPSHOT, type FuelHistory, type FuelItem, type FuelKind, type FuelRegion, type FuelSnapshot } from "@/lib/fuel";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowDown,
  IconArrowUp,
  IconBell,
  IconBellOff,
  IconExternalLink,
  IconFlask,
  IconGasStation,
  IconRefresh,
} from "@tabler/icons-react";
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

function priceOf(it: FuelItem, region: FuelRegion) {
  if (region === 2 && typeof it.priceR2 === "number") return it.priceR2;
  return it.price;
}
function changeOf(it: FuelItem, region: FuelRegion) {
  if (region === 2) return typeof it.changeR2 === "number" ? it.changeR2 : it.change;
  return it.change;
}
function hasR2(items: FuelItem[]) {
  return items.some((it) => typeof it.priceR2 === "number");
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", { hour12: false });
  } catch {
    return iso;
  }
}

function FuelMiniSparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const W = 90;
  const H = 28;
  const P = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const x = (i: number) => P + (i * (W - P * 2)) / (points.length - 1);
  const y = (v: number) => H - P - ((v - min) / range) * (H - P * 2);
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`;
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fp-spark" aria-hidden="true" preserveAspectRatio="none">
      <path d={area} fill={color} opacity="0.14" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(last)} r="2" fill={color} />
    </svg>
  );
}

function FuelHistoryChart({
  history,
  region,
  onRegionChange,
}: {
  history: FuelHistory;
  region: FuelRegion;
  onRegionChange?: (r: FuelRegion) => void;
}) {
  const { t } = useI18n();
  const W = 760;
  const H = 320;
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
  const soloValues = kinds.length > 0 ? points.flatMap((p) => p.items.map((i) => priceOf(i, region))) : [];
  const allValues = noneActive
    ? soloValues
    : points.flatMap((p) => p.items.filter((i) => activeKinds.includes(i.kind)).map((i) => priceOf(i, region)));

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
    if (last) latestByKind.set(k, priceOf(last.items.find((i) => i.kind === k)!, region));
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
                    if (!it) return null;
                    const pr = priceOf(it, region);
                    return { i, x: x(i), y: y(pr), price: pr };
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
              const prev = selectedIdx > 0 ? points[selectedIdx - 1] : null;
              const isLatest = selectedIdx === points.length - 1;
              const latest = points[points.length - 1];
              const first = points[0];
              const daysBetween = (a: Date, b: Date) =>
                Math.round((a.getTime() - b.getTime()) / 86_400_000);
              const windowDays = daysBetween(new Date(latest.date), new Date(first.date));
              const sincePrev = prev ? daysBetween(dt, new Date(prev.date)) : null;
              const weekday = dt.toLocaleDateString("vi-VN", { weekday: "short" });
              const pointHasR2 = activeItems.some((it) => typeof it.priceR2 === "number");
              return (
                <aside className="fp-details">
                  <div className="fp-details-head">
                    <div className="fp-details-head-top">
                      <div className="fp-details-dateline">
                        <span className="fp-details-weekday">{weekday}</span>
                        <span className="fp-details-date">
                          {dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </span>
                      </div>
                      {isLatest && <span className="fp-details-badge">{t("fp_details_latest")}</span>}
                    </div>
                    <div className="fp-details-sub">
                      {sincePrev !== null && (
                        <span>
                          {sincePrev > 0
                            ? t("fp_details_days_since").replace("{n}", String(sincePrev))
                            : t("fp_details_same_day")}
                        </span>
                      )}
                    </div>
                    {pointHasR2 && onRegionChange && (
                      <div className="fp-details-region" role="group" aria-label={t("fp_region_group")}>
                        <button
                          type="button"
                          className={`fp-details-region-btn${region === 1 ? " on" : ""}`}
                          onClick={() => onRegionChange(1)}
                        >
                          {t("fp_region_1")}
                        </button>
                        <button
                          type="button"
                          className={`fp-details-region-btn${region === 2 ? " on" : ""}`}
                          onClick={() => onRegionChange(2)}
                        >
                          {t("fp_region_2")}
                        </button>
                      </div>
                    )}
                  </div>
                  <ul className="fp-details-list">
                    {activeItems.map((it) => {
                      const prevIt = prev?.items.find((x) => x.kind === it.kind);
                      const curPrice = priceOf(it, region);
                      const prevPrice = prevIt ? priceOf(prevIt, region) : undefined;
                      const delta = prevPrice !== undefined ? curPrice - prevPrice : undefined;
                      const pct = prevPrice ? ((curPrice - prevPrice) / prevPrice) * 100 : undefined;
                      const altPrice = region === 1 ? it.priceR2 : it.price;
                      const altLabel = region === 1 ? t("fp_region_2_short") : t("fp_region_1_short");
                      return (
                        <li
                          key={it.kind}
                          className="fp-details-card"
                          style={{ ["--fp-color" as string]: KIND_COLOR[it.kind] }}
                        >
                          <div className="fp-details-card-top">
                            <span className="fp-details-name">{t(KIND_KEY[it.kind])}</span>
                            {delta !== undefined && delta !== 0 && pct !== undefined ? (
                              <span className={`fp-details-chip ${delta > 0 ? "up" : "down"}`}>
                                {delta > 0 ? "▲" : "▼"} {fmtVND(Math.abs(delta))}
                                <em>{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</em>
                              </span>
                            ) : (
                              <span className="fp-details-chip flat">—</span>
                            )}
                          </div>
                          <div className="fp-details-card-price">
                            <b>{fmtVND(curPrice)}</b>
                            <span>đ/{it.unit}</span>
                          </div>
                          {typeof altPrice === "number" && (
                            <div className="fp-details-card-alt">
                              <span className="fp-details-card-alt-label">{altLabel}</span>
                              <span className="fp-details-card-alt-price">
                                {fmtVND(altPrice)} <em>đ/{it.unit}</em>
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="fp-details-foot">
                    {windowDays > 0 && (
                      <div className="fp-details-foot-row">
                        <span>{t("fp_details_window")}</span>
                        <b>{windowDays} {t("fp_details_days")}</b>
                      </div>
                    )}
                    {p.articleUrl && (
                      <a href={p.articleUrl} target="_blank" rel="noreferrer" className="fp-details-link">
                        {t("fp_details_article")} <IconExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </aside>
              );
            })()}
        </div>
      )}
    </Card>
  );
}

const SIG_KEY = "fb-fuel-sig";
const NOTIF_KEY = "fb-fuel-notif";
const PERIODIC_TAG = "fuel-check";
const PERIODIC_MIN_INTERVAL_MS = 60 * 60 * 1000; // 1h — ngưỡng của Chromium

function signatureOf(items: FuelItem[]) {
  return [...items]
    .sort((a, b) => a.kind.localeCompare(b.kind))
    .map((it) => `${it.kind}:${it.price}`)
    .join("|");
}

type BgSyncState = "unsupported" | "unregistered" | "registered" | "permission_denied";

export default function FuelTool() {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<FuelSnapshot | null>(null);
  const [region, setRegion] = useState<FuelRegion>(1);
  const [history, setHistory] = useState<FuelHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Notification settings
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [bgSync, setBgSync] = useState<BgSyncState>("unsupported");
  const [role, setRole] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [installedPwa, setInstalledPwa] = useState(false);

  // Hydrate toggle + Notification support + fetch role
  useEffect(() => {
    try {
      setNotifEnabled(localStorage.getItem(NOTIF_KEY) === "1");
    } catch {}
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
    const loadRole = () => {
      fetch("/api/user/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setRole(d?.user?.role ?? null))
        .catch(() => {});
    };
    loadRole();
    // Reload role khi user login/logout ở AccountMenu / MobileTabBar
    const onUserChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ user?: { role?: string } | null }>).detail;
      if (detail && "user" in detail) {
        setRole(detail.user?.role ?? null);
      } else {
        loadRole();
      }
    };
    window.addEventListener("fb:user-changed", onUserChanged);

    // Detect PWA install state
    const standalone =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches ||
        // iOS Safari
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);
    setInstalledPwa(Boolean(standalone));

    const onInstalled = () => setInstalledPwa(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("fb:user-changed", onUserChanged);
    };
  }, []);

  // Register the service worker so background notifications work when the
  // FormatBox tab is closed (hoạt động trên trình duyệt hỗ trợ Periodic
  // Background Sync — Chrome/Edge, cần PWA được "engaged").
  const registerSW = async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
    try {
      const existing = await navigator.serviceWorker.getRegistration("/sw.js");
      if (existing) return existing;
      return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch {
      return null;
    }
  };

  const ensureBackgroundSync = async (reg: ServiceWorkerRegistration): Promise<BgSyncState> => {
    const periodic = (
      reg as unknown as {
        periodicSync?: {
          register: (tag: string, opts: { minInterval: number }) => Promise<void>;
          getTags: () => Promise<string[]>;
        };
      }
    ).periodicSync;
    if (!periodic) return "unsupported";
    try {
      const status = await navigator.permissions.query({
        // Chromium-only permission name
        name: "periodic-background-sync" as PermissionName,
      });
      if (status.state === "denied") return "permission_denied";
      const tags = await periodic.getTags();
      if (!tags.includes(PERIODIC_TAG)) {
        await periodic.register(PERIODIC_TAG, { minInterval: PERIODIC_MIN_INTERVAL_MS });
      }
      return "registered";
    } catch {
      return "unregistered";
    }
  };

  const handleToggleNotif = async (next: boolean) => {
    if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setNotifEnabled(false);
        try {
          localStorage.setItem(NOTIF_KEY, "0");
        } catch {}
        return;
      }
    }
    setNotifEnabled(next);
    try {
      localStorage.setItem(NOTIF_KEY, next ? "1" : "0");
    } catch {}
    if (next) {
      const reg = await registerSW();
      if (reg) setBgSync(await ensureBackgroundSync(reg));
    }
  };

  // Khi toggle bật sẵn từ phiên trước, chủ động đăng ký lại SW + periodic sync.
  useEffect(() => {
    if (!notifEnabled || permission !== "granted") return;
    (async () => {
      const reg = await registerSW();
      if (reg) setBgSync(await ensureBackgroundSync(reg));
    })();
  }, [notifEnabled, permission]);

  // Detect price change vs last-seen in localStorage (in-tab path, bắn ngay
  // không chờ periodic sync). SW sẽ xử lý khi tab đóng.
  useEffect(() => {
    if (!snapshot || snapshot.source === "fallback" || snapshot.items.length === 0) return;
    const sig = signatureOf(snapshot.items);
    let prev: string | null = null;
    try {
      prev = localStorage.getItem(SIG_KEY);
    } catch {}
    if (prev && prev !== sig) {
      if (notifEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
        navigator.serviceWorker?.ready
          .then((reg) =>
            reg.showNotification(t("fp_notify_sample_title"), {
              body: t("fp_notify_sample_body"),
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              tag: "fb-fuel",
              data: { url: "/fuel" },
            }),
          )
          .catch(() => {});
      }
    }
    try {
      localStorage.setItem(SIG_KEY, sig);
    } catch {}
  }, [snapshot, notifEnabled, t]);

  const sendTestNotification = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      if (typeof window !== "undefined") {
        const ok = window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
        if (!ok) throw new Error("Service Worker cần HTTPS hoặc localhost");
      }
      if (typeof Notification === "undefined") {
        throw new Error(t("fp_notify_browser_unsupported"));
      }
      if (Notification.permission !== "granted") {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") throw new Error(t("fp_notify_browser_denied"));
      }
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker không khả dụng");
      }
      await registerSW();
      const reg = await navigator.serviceWorker.ready;
      const sw = reg.active ?? reg.waiting ?? reg.installing;
      if (!sw) throw new Error("Service Worker chưa active");
      // Bắn đúng loại thông báo thật — SW fetch snapshot mới nhất và show nó.
      sw.postMessage({ type: "fuel-test" });
      setTestMsg(t("fp_notify_test_sent"));
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : "unknown");
    } finally {
      setTesting(false);
    }
  };

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
  const r2Available = hasR2(items);
  const effectiveRegion: FuelRegion = region === 2 && r2Available ? 2 : 1;

  // Per-kind sparkline points lấy từ history (6 điểm gần nhất)
  const sparkByKind = new Map<FuelKind, number[]>();
  if (history) {
    const last = history.points.slice(-6);
    for (const kind of items.map((i) => i.kind)) {
      const series = last
        .map((p) => {
          const hit = p.items.find((it) => it.kind === kind);
          return hit ? priceOf(hit, effectiveRegion) : undefined;
        })
        .filter((v): v is number => typeof v === "number");
      if (series.length >= 2) sparkByKind.set(kind, series);
    }
  }

  return (
    <div className="fp-tool">
      <Card padding="md" variant="outline" className="fp-topbar">
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
            <span className="fp-head-meta">
              <a href="https://vnexpress.net/chu-de/gia-xang-dau-1409" target="_blank" rel="noreferrer">
                VnExpress
              </a>
              {data.publishedAt && (
                <>
                  <span className="fp-head-dot">·</span>
                  {t("fp_published")}: <b>{fmtDateTime(data.publishedAt)}</b>
                </>
              )}
              <span className="fp-head-dot">·</span>
              {t("fp_fetched")}: <b>{fmtDateTime(data.fetchedAt)}</b>
            </span>
          </div>
          <div className="fp-head-actions">
            {r2Available && (
              <div className="fp-region-toggle" role="group" aria-label={t("fp_region_group")}>
                <button
                  type="button"
                  className={`fp-region-btn${region === 1 ? " on" : ""}`}
                  onClick={() => setRegion(1)}
                >
                  {t("fp_region_1")}
                </button>
                <button
                  type="button"
                  className={`fp-region-btn${region === 2 ? " on" : ""}`}
                  onClick={() => setRegion(2)}
                >
                  {t("fp_region_2")}
                </button>
              </div>
            )}
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
        </div>

        {(() => {
          const statusTitle =
            permission === "unsupported"
              ? t("fp_notify_browser_unsupported")
              : permission === "denied"
                ? t("fp_notify_browser_denied")
                : permission === "default"
                  ? t("fp_notify_browser_hint")
                  : installedPwa
                    ? t("fp_notify_pwa_ok")
                    : notifEnabled && bgSync === "registered"
                      ? t("fp_notify_bg_ok")
                      : notifEnabled
                        ? t("fp_notify_bg_fallback")
                        : t("fp_notify_desc");
          const statusTone =
            permission === "denied" || permission === "unsupported"
              ? "warn"
              : (permission === "granted" && notifEnabled && bgSync === "registered") || installedPwa
                ? "ok"
                : "neutral";
          const isOn = notifEnabled && permission === "granted";
          const toggleDisabled = permission === "unsupported" || permission === "denied";
          return (
            <div className="fp-topbar-notify">
              <span className="fp-notify-label">{t("fp_notify_title")}</span>
              <span className={`fp-notify-status fp-notify-status--${statusTone}`} title={statusTitle}>
                {statusTitle}
              </span>
              {testMsg && <span className="fp-notify-toast">{testMsg}</span>}
              <Button
                size="sm"
                variant={isOn ? "primary" : "subtle"}
                onClick={() => handleToggleNotif(!isOn)}
                disabled={toggleDisabled}
                leftIcon={isOn ? <IconBell size={14} stroke={1.9} /> : <IconBellOff size={14} stroke={1.9} />}
                className="fp-notify-toggle-btn"
              >
                {isOn ? t("fp_notify_on") : t("fp_notify_off")}
              </Button>
              {role === "superadmin" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={sendTestNotification}
                  loading={testing}
                  leftIcon={!testing ? <IconFlask size={14} stroke={1.9} /> : undefined}
                  className="fp-notify-test-btn"
                >
                  {t("fp_notify_test")}
                </Button>
              )}
            </div>
          );
        })()}
      </Card>

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
              const price = priceOf(it, effectiveRegion);
              const change = changeOf(it, effectiveRegion) ?? 0;
              const up = change > 0;
              const down = change < 0;
              const altPrice = effectiveRegion === 1 ? it.priceR2 : it.price;
              const altLabel = effectiveRegion === 1 ? t("fp_region_2_short") : t("fp_region_1_short");
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
                    {change !== 0 && (
                      <span className={`fp-change ${up ? "up" : "down"}`}>
                        {up ? <IconArrowUp size={12} stroke={2.4} /> : <IconArrowDown size={12} stroke={2.4} />}
                        {fmtVND(Math.abs(change))}
                      </span>
                    )}
                  </div>
                  <div className="fp-name">{it.name}</div>
                  <div className="fp-price-row">
                    <div className="fp-price">
                      <b>{fmtVND(price)}</b>
                      <span>đ/{it.unit}</span>
                    </div>
                    {sparkByKind.has(it.kind) && (
                      <FuelMiniSparkline points={sparkByKind.get(it.kind)!} color={KIND_COLOR[it.kind]} />
                    )}
                  </div>
                  {typeof altPrice === "number" && (
                    <div className="fp-card-alt">
                      {altLabel}: <b>{fmtVND(altPrice)}</b> đ/{it.unit}
                    </div>
                  )}
                </Card>
              );
            })}
      </div>

      {history && history.points.length >= 2 && (
        <FuelHistoryChart history={history} region={effectiveRegion} onRegionChange={setRegion} />
      )}
    </div>
  );
}
