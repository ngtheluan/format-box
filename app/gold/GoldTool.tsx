"use client";
import { Alert, Badge, Button, Card, Skeleton } from "@/components/ui";
import { FALLBACK_SNAPSHOT, type GoldItem, type GoldSnapshot } from "@/lib/gold";
import { useI18n } from "@/lib/i18n";
import { IconCoin, IconExternalLink, IconRefresh } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

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

function colorForItem(it: GoldItem): string {
  const key = (it.karat || it.name).toLowerCase();
  if (key.includes("sjc")) return "#f59e0b";
  if (key.includes("24") || key.includes("999")) return "#eab308";
  if (key.includes("18") || key.includes("75")) return "#fbbf24";
  if (key.includes("14")) return "#fcd34d";
  if (key.includes("10")) return "#fde68a";
  return "#f59e0b";
}

export default function GoldTool() {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<GoldSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [branch, setBranch] = useState<string>("all");

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

  const data = snapshot ?? FALLBACK_SNAPSHOT;
  const isFallback = data.source === "fallback";

  const branches = useMemo(() => {
    const set = new Set<string>();
    data.items.forEach((it) => it.branch && set.add(it.branch));
    return Array.from(set);
  }, [data.items]);

  const items = useMemo(() => {
    if (branch === "all") return data.items;
    return data.items.filter((it) => (it.branch ?? "") === branch);
  }, [data.items, branch]);

  return (
    <div className="fp-tool">
      <div className="fp-head">
        <div className="fp-head-info">
          <Badge variant="dot" tone={isFallback ? "warning" : "success"}>
            {isFallback ? t("gp_mode_fallback") : t("gp_mode_live")}
          </Badge>
          {data.sourceUrl && (
            <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="fp-src-link">
              SJC feed <IconExternalLink size={12} />
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
          {t("gp_refresh")}
        </Button>
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

      {branches.length > 1 && (
        <div className="gp-branches">
          <button
            type="button"
            className={`gp-branch${branch === "all" ? " on" : ""}`}
            onClick={() => setBranch("all")}
          >
            {t("gp_branch_all")}
          </button>
          {branches.map((b) => (
            <button
              key={b}
              type="button"
              className={`gp-branch${branch === b ? " on" : ""}`}
              onClick={() => setBranch(b)}
            >
              {b}
            </button>
          ))}
        </div>
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
          : items.map((it, idx) => {
              const color = colorForItem(it);
              const spread = it.sell - it.buy;
              return (
                <Card
                  key={`${it.branch ?? ""}-${it.name}-${idx}`}
                  padding="md"
                  variant="outline"
                  className="fp-card"
                  style={{ ["--fp-color" as string]: color }}
                >
                  <div className="fp-card-head">
                    <Badge variant="soft" tone="neutral" className="fp-badge">
                      <IconCoin size={12} />
                      {it.karat ?? it.name.split(" ")[0]}
                    </Badge>
                    {it.branch && <span className="gp-branch-tag">{it.branch}</span>}
                  </div>
                  <div className="fp-name">{it.name}</div>
                  <div className="gp-prices">
                    <div className="gp-price">
                      <span className="gp-price-lbl">{t("gp_buy")}</span>
                      <b>{fmtVND(it.buy)}</b>
                      <em>đ/lượng</em>
                    </div>
                    <div className="gp-price">
                      <span className="gp-price-lbl">{t("gp_sell")}</span>
                      <b>{fmtVND(it.sell)}</b>
                      <em>đ/lượng</em>
                    </div>
                  </div>
                  {spread > 0 && (
                    <div className="gp-spread">
                      {t("gp_spread")}: <b>{fmtVND(spread)}</b> đ
                    </div>
                  )}
                </Card>
              );
            })}
      </div>

      {!loading && items.length === 0 && (
        <Alert tone="info" title={t("gp_empty_title")}>
          {t("gp_empty_msg")}
        </Alert>
      )}

      <div className="fp-meta">
        <span className="fp-meta-item">
          {t("gp_source")}:{" "}
          <a href="https://sjc.com.vn/" target="_blank" rel="noreferrer">
            SJC
          </a>
        </span>
        {data.updatedAt && (
          <span className="fp-meta-item">
            {t("gp_published")}: <b>{fmtDateTime(data.updatedAt)}</b>
          </span>
        )}
        <span className="fp-meta-item">
          {t("gp_fetched")}: <b>{fmtDateTime(data.fetchedAt)}</b>
        </span>
      </div>
    </div>
  );
}
