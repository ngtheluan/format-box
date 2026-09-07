"use client";
import { Alert, Badge, Button, Card, DatePickerInput, Input, Skeleton } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { FALLBACK_LOTTERY, matchTicket, type LotterySnapshot, type Region, type TicketMatch } from "@/lib/lottery";
import {
  FALLBACK_VIETLOTT,
  VIETLOTT_PRODUCTS,
  matchVietlottTicket,
  type VietlottProduct,
  type VietlottSnapshot,
} from "@/lib/vietlott";
import { IconConfetti, IconExternalLink, IconRefresh, IconSearch, IconTicket } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

type Mode = "traditional" | "vietlott";

const REGIONS: { key: Region; label: string }[] = [
  { key: "mb", label: "Miền Bắc" },
  { key: "mn", label: "Miền Nam" },
  { key: "mt", label: "Miền Trung" },
];

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", { hour12: false });
  } catch {
    return iso;
  }
}

// dd/mm/yyyy → yyyy-mm-dd (for the native date input)
function toIsoDate(s?: string) {
  if (!s) return "";
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

function todayIso() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function isoToDdmmyyyy(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export default function LuckyTicketTool() {
  const [mode, setMode] = useState<Mode>("traditional");
  return (
    <div className="fp-tool lt-tool">
      <div className="gp-branches lt-regions" style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <button
          type="button"
          className={`gp-branch${mode === "traditional" ? " on" : ""}`}
          onClick={() => setMode("traditional")}
        >
          Xổ số truyền thống
        </button>
        <button
          type="button"
          className={`gp-branch${mode === "vietlott" ? " on" : ""}`}
          onClick={() => setMode("vietlott")}
        >
          Vietlott
        </button>
      </div>
      {mode === "traditional" ? <TraditionalPanel /> : <VietlottPanel />}
    </div>
  );
}

function TraditionalPanel() {
  const { t } = useI18n();
  const [region, setRegion] = useState<Region>("mn");
  // yyyy-mm-dd. Empty = "let the API pick the latest available draw". After
  // that first fetch we sync the picker to whatever date came back, so if
  // today's draw isn't out yet the picker shows the previous draw day.
  const [date, setDate] = useState<string>("");
  const [autoSyncDate, setAutoSyncDate] = useState(true);
  const [snapshot, setSnapshot] = useState<LotterySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Sync picker to the actual result date whenever the user hasn't picked one
  // manually. This is what backs "default to previous day when today is empty".
  useEffect(() => {
    if (!autoSyncDate) return;
    const iso = toIsoDate(snapshot?.resultDate);
    if (iso && iso !== date) setDate(iso);
  }, [snapshot, autoSyncDate, date]);

  const changeDate = (d: string) => {
    // Clearing with ✕ re-enables auto-sync so the picker snaps to the freshest
    // available draw for the current region.
    setAutoSyncDate(d === "");
    setDate(d);
  };

  const load = async (r: Region, d: string, signal?: AbortSignal) => {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams({ region: r });
      if (d) q.set("date", d);
      const res = await fetch(`/api/lottery?${q}`, { cache: "no-store", signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const snap: LotterySnapshot = await res.json();
      setSnapshot(snap);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setErr(e instanceof Error ? e.message : "unknown");
      setSnapshot(FALLBACK_LOTTERY[r]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    load(region, date, ctrl.signal);
    return () => ctrl.abort();
  }, [region, date]);

  const data = snapshot ?? FALLBACK_LOTTERY[region];
  const isFallback = data.source === "fallback";

  const cleanedTicket = ticket.replace(/\D/g, "");
  const matches: TicketMatch[] = useMemo(() => {
    if (!cleanedTicket) return [];
    return matchTicket(cleanedTicket, data);
  }, [cleanedTicket, data]);

  const bestPrizeLabel = matches[0]?.label;
  const maxDateIso = mounted ? todayIso() : undefined;

  return (
    <>
      <div className="lt-controls">
        <div className="lt-controls-row">
          <div className="gp-branches lt-regions">
            {REGIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`gp-branch${region === r.key ? " on" : ""}`}
                onClick={() => {
                  setRegion(r.key);
                  // A different region can have a different latest draw day —
                  // re-enable auto-sync so the picker follows it.
                  setAutoSyncDate(true);
                  setDate("");
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <DatePickerInput
            inputSize="sm"
            value={date}
            onValueChange={changeDate}
            max={maxDateIso}
            aria-label="Chọn ngày"
            clearTitle="Về kỳ mới nhất"
            className="lt-date-input"
          />
          <div className="lt-controls-right">
            <Badge variant="dot" tone={isFallback ? "warning" : "success"}>
              {isFallback ? t("lt_mode_fallback") : t("lt_mode_live")}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => load(region, date)}
              loading={loading}
              leftIcon={!loading ? <IconRefresh size={14} stroke={1.9} /> : undefined}
            >
              {t("lt_refresh")}
            </Button>
          </div>
        </div>

        <div className="lt-check-inline">
          <Input
            value={ticket}
            onChange={(e) => setTicket(e.target.value.replace(/[^\d\s]/g, "").slice(0, 8))}
            placeholder={t("lt_check_ph")}
            leftIcon={<IconSearch size={14} />}
            inputMode="numeric"
            style={{ fontFamily: "var(--mono)", letterSpacing: 2 }}
          />
          {cleanedTicket && (
            <div className={`lt-check-summary ${matches.length > 0 ? "win" : "miss"}`}>
              {matches.length > 0 ? (
                <>
                  <IconTicket size={14} /> <IconConfetti size={14} /> Trúng <b>{bestPrizeLabel}</b> ({matches[0].matchedDigits} chữ số)
                </>
              ) : (
                <>Không trúng giải nào</>
              )}
            </div>
          )}
        </div>
      </div>

      {mounted &&
        data.resultDate &&
        !loading &&
        (() => {
          const today = todayIso();
          const iso = toIsoDate(data.resultDate);
          if (autoSyncDate) {
            // Picker was auto-set to the latest available draw. Only surface a
            // note when that latest is NOT today (i.e. today's draw isn't out
            // yet); otherwise stay silent.
            if (iso === today) return null;
            return (
              <Alert tone="info" title={`Kết quả kỳ mở gần nhất: ${data.resultDate}`}>
                Chưa có kết quả cho hôm nay ({isoToDdmmyyyy(today)}).
              </Alert>
            );
          }
          // User picked a specific date; if the returned date differs, they
          // asked for a day with no draw (e.g. Sunday in MB was fine, but a
          // rare gap) — show what actually came back.
          if (iso === date) return null;
          return (
            <Alert tone="info" title={`Kết quả ngày ${data.resultDate}`}>
              Ngày {isoToDdmmyyyy(date)} chưa có kết quả — hiển thị kỳ mở gần nhất {data.resultDate}.
            </Alert>
          );
        })()}
      {isFallback && !loading && (
        <Alert tone="warning" title={t("lt_stale_title")}>
          {data.note ?? t("lt_stale_msg")}
        </Alert>
      )}
      {err && !isFallback && (
        <Alert tone="danger" title={t("lt_err_title")}>
          {err}
        </Alert>
      )}

      {cleanedTicket && matches.length > 0 && (
        <div className="lt-match-strip">
          {matches.slice(0, 8).map((m, i) => (
            <span key={i} className="lt-match-chip">
              <b>{m.label}</b> · {m.province} · <code>{m.matchedNumber}</code>
            </span>
          ))}
        </div>
      )}

      <div className="lt-results">
        {loading && !snapshot
          ? Array.from({ length: region === "mb" ? 1 : 3 }).map((_, i) => (
              <Card key={i} padding="sm" variant="outline">
                <Skeleton width={140} height={18} />
                <div style={{ marginTop: 10 }}>
                  <Skeleton width="100%" height={200} />
                </div>
              </Card>
            ))
          : data.provinces.map((p) => (
              <Card key={p.province} padding="sm" variant="outline" className="lt-prov-card">
                <div className="lt-prov-head">
                  <div className="lt-prov-name">
                    {p.province}
                    {p.code && <span className="lt-prov-code">{p.code}</span>}
                  </div>
                </div>
                <table className="lt-table">
                  <tbody>
                    {p.prizes.map((row) => (
                      <tr key={row.tier}>
                        <th>{row.label}</th>
                        <td>
                          <div className="lt-nums">
                            {row.numbers.map((n, i) => {
                              const cleanN = n.replace(/\D/g, "");
                              const cmpLen = Math.min(cleanN.length, cleanedTicket.length);
                              const hit =
                                cleanedTicket.length > 0 &&
                                cmpLen > 0 &&
                                cleanedTicket.slice(-cmpLen) === cleanN.slice(-cmpLen);
                              return (
                                <span key={i} className={`lt-num${hit ? " hit" : ""}`}>
                                  {n}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))}
      </div>

      {!loading && data.provinces.length === 0 && (
        <Alert tone="info" title={t("lt_empty_title")}>
          {t("lt_empty_msg")}
        </Alert>
      )}

      <div className="fp-meta lt-meta">
        <span className="fp-meta-item">
          {t("lt_source")}:{" "}
          <a href="https://www.minhngoc.net.vn/" target="_blank" rel="noreferrer">
            minhngoc.net.vn
          </a>
          {data.sourceUrl && (
            <>
              {" "}
              <a href={data.sourceUrl} target="_blank" rel="noreferrer">
                <IconExternalLink size={11} />
              </a>
            </>
          )}
        </span>
        {mounted && data.fetchedAt && (
          <span className="fp-meta-item">
            {t("lt_fetched")}: <b>{fmtDateTime(data.fetchedAt)}</b>
          </span>
        )}
      </div>
    </>
  );
}

function VietlottPanel() {
  const { t } = useI18n();
  const [product, setProduct] = useState<VietlottProduct>("power655");
  const [snap, setSnap] = useState<VietlottSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const load = async (p: VietlottProduct, signal?: AbortSignal) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/vietlott?product=${p}`, { cache: "no-store", signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSnap(await res.json());
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setErr(e instanceof Error ? e.message : "unknown");
      setSnap(FALLBACK_VIETLOTT[p]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    load(product, ctrl.signal);
    return () => ctrl.abort();
  }, [product]);

  const data = snap ?? FALLBACK_VIETLOTT[product];
  const isFallback = data.source === "fallback";
  const needCount = product === "power655" ? 7 : 6;
  const latest = data.draws[0];

  const ticketNumbers = useMemo(() => {
    return ticket
      .split(/[\s,;]+/)
      .map((s) => s.replace(/\D/g, ""))
      .filter((s) => s.length > 0)
      .slice(0, needCount);
  }, [ticket, needCount]);

  const check = useMemo(() => {
    if (!latest || ticketNumbers.length < 6) return null;
    return matchVietlottTicket(ticketNumbers, latest, product);
  }, [ticketNumbers, latest, product]);

  return (
    <>
      <div className="lt-controls">
        <div className="lt-controls-row">
          <div className="gp-branches lt-regions">
            {VIETLOTT_PRODUCTS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`gp-branch${product === p.key ? " on" : ""}`}
                onClick={() => setProduct(p.key)}
                title={p.schedule}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="lt-controls-right">
            <Badge variant="dot" tone={isFallback ? "warning" : "success"}>
              {isFallback ? t("lt_mode_fallback") : t("lt_mode_live")}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => load(product)}
              loading={loading}
              leftIcon={!loading ? <IconRefresh size={14} stroke={1.9} /> : undefined}
            >
              {t("lt_refresh")}
            </Button>
          </div>
        </div>

        <div className="lt-check-inline">
          <Input
            value={ticket}
            onChange={(e) => setTicket(e.target.value.replace(/[^\d\s,;]/g, ""))}
            placeholder={
              product === "power655"
                ? "Nhập 6 số + 1 số Power (VD: 01 09 22 34 45 55 12)"
                : "Nhập 6 số (VD: 03 09 14 22 27 40)"
            }
            leftIcon={<IconSearch size={14} />}
            inputMode="numeric"
            style={{ fontFamily: "var(--mono)", letterSpacing: 1 }}
          />
          {ticketNumbers.length > 0 && ticketNumbers.length < 6 && (
            <div className="lt-check-summary miss">Cần {6 - ticketNumbers.length} số nữa</div>
          )}
          {check && (
            <div className={`lt-check-summary ${check.tier === "—" ? "miss" : "win"}`}>
              {check.tier === "—" ? (
                <>Trùng {check.matched} số — không trúng giải</>
              ) : (
                <>
                  <IconTicket size={14} /> <IconConfetti size={14} /> Trúng <b>{check.tier}</b> ({check.matched} số
                  {check.powerMatched ? " + Power" : ""})
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {isFallback && !loading && (
        <Alert tone="warning" title={t("lt_stale_title")}>
          {data.note ?? t("lt_stale_msg")}
        </Alert>
      )}
      {err && !isFallback && (
        <Alert tone="danger" title={t("lt_err_title")}>
          {err}
        </Alert>
      )}

      {loading && !snap ? (
        <div className="vl-jackpot-wrap">
          <Skeleton width="100%" height={80} />
          {product === "power655" && (
            <div style={{ marginTop: 10 }}>
              <Skeleton width="100%" height={80} />
            </div>
          )}
        </div>
      ) : latest ? (
        <>
          <div className="vl-jackpot-title">
            Giá trị Jackpot ước tính · Kỳ #{data.nextDrawId ?? "—"}
          </div>
          <div className="vl-jackpot-wrap">
            {latest.jackpot1 && (
              <div className="vl-jackpot vl-jackpot-1">
                <div className="vl-jackpot-label">
                  {product === "power655" ? "Giá trị Jackpot 1 ước tính" : "Giá trị Jackpot ước tính"}
                </div>
                <div className="vl-jackpot-amount">{latest.jackpot1} <span>VNĐ</span></div>
              </div>
            )}
            {product === "power655" && latest.jackpot2 && (
              <div className="vl-jackpot vl-jackpot-2">
                <div className="vl-jackpot-label">Giá trị Jackpot 2 ước tính</div>
                <div className="vl-jackpot-amount">{latest.jackpot2} <span>VNĐ</span></div>
              </div>
            )}
          </div>

          <div className="vl-history-title">Kết quả quay số mở thưởng</div>
          <div className="vl-draws">
            {data.draws.map((d) => {
              const isLatest = d.drawId === latest.drawId;
              const hits = new Set(
                isLatest
                  ? ticketNumbers.slice(0, 6).map((n) => n.padStart(2, "0")).filter((n) => d.whiteBalls.includes(n))
                  : [],
              );
              const powerHit =
                isLatest &&
                product === "power655" &&
                ticketNumbers[6] &&
                ticketNumbers[6].padStart(2, "0") === d.powerBall;
              return (
                <div key={d.drawId} className="vl-draw-row">
                  <div className="vl-draw-head">
                    <span className="vl-draw-id">
                      <span className="vl-draw-bar" /> Kỳ {d.drawId}
                      {d.jackpotWon && <span className="vl-star" title="Kỳ có vé trúng Jackpot">⭐</span>}
                    </span>
                    <span className="vl-draw-date">{d.date}</span>
                  </div>
                  <div className="vl-balls">
                    {d.whiteBalls.map((n, i) => (
                      <span key={i} className={`vl-ball${hits.has(n) ? " on" : ""}`}>
                        {n}
                      </span>
                    ))}
                    {product === "power655" && d.powerBall && (
                      <span className={`vl-ball vl-ball-power${powerHit ? " on" : ""}`}>{d.powerBall}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="fp-meta lt-meta">
        <span className="fp-meta-item">
          {t("lt_source")}:{" "}
          <a href="https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott.html" target="_blank" rel="noreferrer">
            minhngoc.net.vn
          </a>
          {data.sourceUrl && (
            <>
              {" "}
              <a href={data.sourceUrl} target="_blank" rel="noreferrer">
                <IconExternalLink size={11} />
              </a>
            </>
          )}
        </span>
        {mounted && data.fetchedAt && (
          <span className="fp-meta-item">
            {t("lt_fetched")}: <b>{fmtDateTime(data.fetchedAt)}</b>
          </span>
        )}
      </div>
    </>
  );
}
