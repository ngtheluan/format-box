"use client";
import { Alert, Badge, Button, Card, Skeleton } from "@/components/ui";
import { FALLBACK_SNAPSHOT, type GoldItem, type GoldSnapshot } from "@/lib/gold";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowDown,
  IconArrowUp,
  IconClockHour4,
  IconExternalLink,
  IconInfoCircle,
  IconMapPin,
  IconRefresh,
  IconSparkles,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

type Group = "premium" | "high" | "mid" | "low" | "raw";

const GROUP_ORDER: Group[] = ["premium", "high", "mid", "low", "raw"];

const GROUP_META: Record<Group, { vi: string; en: string; icon: string }> = {
  premium: { vi: "Vàng miếng & Nhẫn trơn 999.9", en: "Bar & Plain rings 999.9", icon: "★" },
  high: { vi: "Nữ trang cao tuổi (22K – 24K)", en: "High-karat jewelry (22K – 24K)", icon: "◆" },
  mid: { vi: "Nữ trang tuổi trung (14K – 18K)", en: "Mid-karat jewelry (14K – 18K)", icon: "◇" },
  low: { vi: "Nữ trang tuổi thấp (8K – 10K)", en: "Low-karat jewelry (8K – 10K)", icon: "○" },
  raw: { vi: "Vàng nguyên liệu", en: "Raw material", icon: "▢" },
};

function groupOf(it: GoldItem): Group {
  const code = it.code.toUpperCase();
  if (code.startsWith("RAW")) return "raw";
  const k = (it.karat ?? "").toUpperCase();
  if (["SJC", "N24K", "KB", "TL", "PNJ"].includes(code)) return "premium";
  if (["24K", "22K"].includes(k) || /999|9920|99$/.test(code)) return "high";
  if (["18K", "16K", "16.3K", "15K", "15.6K", "14K", "14.6K"].includes(k)) return "mid";
  if (["10K", "9K", "8K"].includes(k)) return "low";
  return "high";
}

function karatAccent(k: string): string {
  const K = k.toUpperCase();
  if (K === "SJC") return "#f59e0b";
  if (K === "24K") return "#eab308";
  if (K === "22K") return "#ca8a04";
  if (K === "18K") return "#a16207";
  if (K.startsWith("16") || K.startsWith("15") || K.startsWith("14")) return "#854d0e";
  if (K === "10K" || K === "9K" || K === "8K") return "#78716c";
  if (K === "NL") return "#64748b";
  return "#f59e0b";
}

function fmtVND(n: number) {
  return n.toLocaleString("vi-VN");
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", { hour12: false });
  } catch {
    return iso;
  }
}

function fmtRelative(iso?: string, now = Date.now()): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

function HeroCard({ item }: { item: GoldItem }) {
  const spread = item.sell - item.buy;
  const spreadPct = ((spread / item.buy) * 100).toFixed(2);
  return (
    <Card padding="lg" variant="outline" className="gp-hero">
      <div className="gp-hero-glow" aria-hidden />
      <div className="gp-hero-head">
        <Badge variant="soft" tone="warning" className="gp-hero-badge">
          <IconSparkles size={12} /> Featured
        </Badge>
        <span className="gp-hero-brand">{item.name}</span>
      </div>
      <div className="gp-hero-body">
        <div className="gp-hero-side">
          <span className="gp-hero-lbl">
            <IconArrowDown size={13} stroke={2.2} /> Mua vào
          </span>
          <div className="gp-hero-value">{fmtVND(item.buy)}</div>
          <span className="gp-hero-unit">đ / lượng</span>
        </div>
        <div className="gp-hero-divider" aria-hidden />
        <div className="gp-hero-side">
          <span className="gp-hero-lbl">
            <IconArrowUp size={13} stroke={2.2} /> Bán ra
          </span>
          <div className="gp-hero-value">{fmtVND(item.sell)}</div>
          <span className="gp-hero-unit">đ / lượng</span>
        </div>
      </div>
      <div className="gp-hero-foot">
        <span className="gp-hero-chip">Chênh lệch mua-bán</span>
        <b>{fmtVND(spread)} đ</b>
        <span className="gp-hero-pct">({spreadPct}%)</span>
      </div>
    </Card>
  );
}

function PriceRow({ item }: { item: GoldItem }) {
  const spread = item.sell - item.buy;
  const color = karatAccent(item.karat ?? "");
  return (
    <div className="gp-row" style={{ ["--gp-acc" as string]: color }}>
      <div className="gp-row-lead">
        <span className="gp-row-karat">{item.karat ?? item.code}</span>
        <div className="gp-row-name" title={item.name}>
          {item.name}
        </div>
      </div>
      <div className="gp-row-prices">
        <div className="gp-row-cell gp-row-buy">
          <span className="gp-row-lbl">Mua</span>
          <b>{fmtVND(item.buy)}</b>
        </div>
        <div className="gp-row-cell gp-row-sell">
          <span className="gp-row-lbl">Bán</span>
          <b>{fmtVND(item.sell)}</b>
        </div>
        <div className="gp-row-cell gp-row-diff">
          <span className="gp-row-lbl">Chênh</span>
          <b>+{fmtShort(spread)}</b>
        </div>
      </div>
    </div>
  );
}

export default function GoldTool() {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<GoldSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<Group | "all">("all");
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0); // for re-rendering relative time

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/gold", { cache: "no-store", signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const snap: GoldSnapshot = await res.json();
      setSnapshot(snap);
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

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const data = snapshot ?? FALLBACK_SNAPSHOT;
  const isFallback = data.source === "fallback";

  const featured = useMemo(() => data.items.find((i) => i.code === "SJC") ?? data.items[0], [data.items]);

  const grouped = useMemo(() => {
    const map = new Map<Group, GoldItem[]>();
    for (const it of data.items) {
      if (featured && it.code === featured.code) continue; // don't duplicate hero item
      const g = groupOf(it);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(it);
    }
    return map;
  }, [data.items, featured]);

  const q = query.trim().toLowerCase();
  const filteredGroups: [Group, GoldItem[]][] = useMemo(() => {
    return GROUP_ORDER.filter((g) => (active === "all" ? true : g === active))
      .map((g) => {
        const items = (grouped.get(g) ?? []).filter((it) => {
          if (!q) return true;
          return (
            it.name.toLowerCase().includes(q) ||
            it.code.toLowerCase().includes(q) ||
            (it.karat ?? "").toLowerCase().includes(q)
          );
        });
        return [g, items] as [Group, GoldItem[]];
      })
      .filter(([, items]) => items.length > 0);
  }, [grouped, active, q]);

  const totalShown = filteredGroups.reduce((s, [, arr]) => s + arr.length, 0);
  const relative = fmtRelative(data.updatedAt, Date.now() + tick * 0); // tick triggers re-render

  return (
    <div className="fp-tool gp-tool">
      {/* HEAD */}
      <div className="gp-topbar">
        <div className="gp-topbar-status">
          <Badge variant="dot" tone={isFallback ? "warning" : "success"}>
            {isFallback ? t("gp_mode_fallback") : t("gp_mode_live")}
          </Badge>
          {data.branch && (
            <span className="gp-topbar-branch">
              <IconMapPin size={12} stroke={2} />
              {data.branch === "hochiminh" ? "TP. Hồ Chí Minh" : data.branch}
            </span>
          )}
          {relative && (
            <span className="gp-topbar-updated" title={fmtDateTime(data.updatedAt)}>
              <IconClockHour4 size={12} stroke={2} />
              {relative}
            </span>
          )}
        </div>
        <div className="gp-topbar-actions">
          {data.sourceUrl && (
            <a href="https://giavang.pnj.com.vn/" target="_blank" rel="noreferrer" className="gp-topbar-src">
              PNJ live feed <IconExternalLink size={12} />
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load()}
            loading={loading}
            leftIcon={!loading ? <IconRefresh size={14} stroke={1.9} /> : undefined}
          >
            {t("gp_refresh")}
          </Button>
        </div>
      </div>

      {isFallback && !loading && (
        <Alert tone="warning" title={t("gp_stale_title")}>
          {data.note ?? t("gp_stale_msg")}
        </Alert>
      )}
      {err && !isFallback && (
        <Alert tone="danger" title={t("gp_err_title")}>
          {err}
        </Alert>
      )}

      {/* HERO */}
      {loading && !snapshot ? (
        <Card padding="lg" variant="outline" className="gp-hero">
          <Skeleton width={120} height={16} />
          <div style={{ margin: "16px 0" }}>
            <Skeleton width={220} height={40} />
          </div>
          <Skeleton width={160} height={14} />
        </Card>
      ) : featured ? (
        <HeroCard item={featured} />
      ) : null}

      {/* FILTERS */}
      <div className="gp-filters">
        <div className="gp-tabs" role="tablist" aria-label="Nhóm vàng">
          <button
            type="button"
            role="tab"
            aria-selected={active === "all"}
            className={`gp-tab${active === "all" ? " on" : ""}`}
            onClick={() => setActive("all")}
          >
            Tất cả
            <span className="gp-tab-count">{data.items.length}</span>
          </button>
          {GROUP_ORDER.map((g) => {
            const count = grouped.get(g)?.length ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={active === g}
                className={`gp-tab${active === g ? " on" : ""}`}
                onClick={() => setActive(g)}
              >
                <span aria-hidden style={{ marginRight: 4 }}>
                  {GROUP_META[g].icon}
                </span>
                {GROUP_META[g].vi.split(" (")[0]}
                <span className="gp-tab-count">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="gp-search">
          <input
            type="search"
            className="gp-search-input"
            placeholder="Tìm nhanh: 24K, 18K, nhẫn, PNJ…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* GROUPS */}
      {loading && !snapshot ? (
        <div className="gp-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={54} />
          ))}
        </div>
      ) : totalShown === 0 ? (
        <Alert tone="info" title="Không có kết quả">
          Không có mục nào khớp — thử bỏ bộ lọc hoặc từ khóa khác.
        </Alert>
      ) : (
        filteredGroups.map(([g, items]) => (
          <section key={g} className="gp-section">
            <header className="gp-section-head">
              <span className="gp-section-icon" aria-hidden>
                {GROUP_META[g].icon}
              </span>
              <h3 className="gp-section-title">{GROUP_META[g].vi}</h3>
              <span className="gp-section-count">{items.length} loại</span>
            </header>
            <div className="gp-list">
              {items.map((it) => (
                <PriceRow key={it.code} item={it} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* FOOT */}
      <div className="gp-foot">
        <div className="gp-foot-note">
          <IconInfoCircle size={13} />
          Nguồn:{" "}
          <a href="https://giavang.pnj.com.vn/" target="_blank" rel="noreferrer">
            PNJ live feed
          </a>{" "}
          — cập nhật vài phút một lần, đơn vị <b>đ/lượng</b> (1 lượng = 10 chỉ).
        </div>
        {data.updatedAt && (
          <div className="gp-foot-meta">
            Bảng giá: <b>{fmtDateTime(data.updatedAt)}</b> · Đồng bộ: <b>{fmtDateTime(data.fetchedAt)}</b>
          </div>
        )}
      </div>
    </div>
  );
}
