"use client";
import { Alert, Badge, Button, Card, DatePickerInput, Input, Skeleton } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { FALLBACK_LOTTERY, type LotterySnapshot, type Region, type TicketMatch, matchTicket } from "@/lib/lottery";
import { IconExternalLink, IconRefresh, IconSearch, IconTicket } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

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
  const { t } = useI18n();
  const [region, setRegion] = useState<Region>("mn");
  const [date, setDate] = useState<string>(""); // yyyy-mm-dd; "" = latest
  const [snapshot, setSnapshot] = useState<LotterySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState("");
  const [mounted, setMounted] = useState(false);
  // Initialise the date picker with today (client-only to keep SSR stable).
  useEffect(() => {
    setMounted(true);
    setDate(todayIso());
  }, []);

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
  const isPastDate = mounted && date !== "" && date !== todayIso();

  return (
    <div className="fp-tool lt-tool">
      <div className="lt-controls">
        <div className="lt-controls-row">
          <div className="gp-branches lt-regions">
            {REGIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`gp-branch${region === r.key ? " on" : ""}`}
                onClick={() => setRegion(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <DatePickerInput
            inputSize="sm"
            value={date}
            onValueChange={setDate}
            max={maxDateIso}
            aria-label="Chọn ngày"
            clearTitle="Về kỳ mới nhất"
            className="lt-date-input"
          />
          {/* isCustomDate is now driven inside DatePickerInput's own clear button */}
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
                  <IconTicket size={14} /> 🎉 Trúng <b>{bestPrizeLabel}</b> ({matches[0].matchedDigits} chữ số)
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
          const iso = toIsoDate(data.resultDate);
          const askedIso = date || todayIso();
          if (iso === askedIso) return null;
          const ctx = isPastDate
            ? `Ngày ${isoToDdmmyyyy(askedIso)} chưa có kết quả — hiển thị kỳ mở gần nhất ${data.resultDate}.`
            : `Chưa có kết quả cho hôm nay (${isoToDdmmyyyy(askedIso)}) — hiển thị kỳ mở gần nhất ${data.resultDate}.`;
          return (
            <Alert tone="info" title={`Kết quả ngày ${data.resultDate}`}>
              {ctx}
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
    </div>
  );
}
