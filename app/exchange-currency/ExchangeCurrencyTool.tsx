"use client";
import { Alert, Badge, Button, Card } from "@/components/ui";
import {
  CURRENCIES,
  CURRENCY_MAP,
  FALLBACK_SNAPSHOT,
  convert,
  crossRate,
  fmtAmount,
  fmtRate,
  type CurrencyCode,
  type ExchangeSnapshot,
} from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import {
  IconArrowsLeftRight,
  IconClockHour4,
  IconCopy,
  IconExternalLink,
  IconInfoCircle,
  IconRefresh,
  IconSend,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

const QUICK_PAIRS: Array<[CurrencyCode, CurrencyCode]> = [
  ["USD", "VND"],
  ["EUR", "VND"],
  ["JPY", "VND"],
  ["KRW", "VND"],
  ["CNY", "VND"],
  ["THB", "VND"],
  ["SGD", "VND"],
  ["AUD", "VND"],
];

function fmtRelative(iso?: string, now = Date.now()): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", { hour12: false });
  } catch {
    return iso;
  }
}

function CurrencySelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
  ariaLabel: string;
}) {
  return (
    <select
      className="xc-sel-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} — {c.name.vi}
        </option>
      ))}
    </select>
  );
}

export default function ExchangeCurrencyTool() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [snapshot, setSnapshot] = useState<ExchangeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const [amount, setAmount] = useState<string>("100");
  const [from, setFrom] = useState<CurrencyCode>("USD");
  const [to, setTo] = useState<CurrencyCode>("VND");
  const [isTransfer, setIsTransfer] = useState<boolean>(true);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/exchange-currency", { cache: "no-store", signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const snap: ExchangeSnapshot = await res.json();
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

  const amt = Number(amount.replace(/[,\s]/g, "")) || 0;
  const midResult = useMemo(() => convert(amt, from, to, data.rates), [amt, from, to, data.rates]);

  const TRANSFER_SPREAD = 0.012;
  const TRANSFER_FIXED_USD = 2;
  const transferResult = useMemo(() => {
    if (midResult == null) return null;
    const fixedFeeInTo = convert(TRANSFER_FIXED_USD, "USD", to, data.rates) ?? 0;
    return midResult * (1 - TRANSFER_SPREAD) - fixedFeeInTo;
  }, [midResult, to, data.rates]);

  const result = isTransfer ? transferResult : midResult;
  const rate = useMemo(() => crossRate(from, to, data.rates), [from, to, data.rates]);
  const inverse = useMemo(() => crossRate(to, from, data.rates), [from, to, data.rates]);

  const relative = fmtRelative(data.updatedAt, Date.now() + tick * 0);
  const fromMeta = CURRENCY_MAP.get(from);
  const toMeta = CURRENCY_MAP.get(to);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const copyResult = async () => {
    if (result == null) return;
    try {
      await navigator.clipboard.writeText(`${fmtAmount(result, to)} ${to}`);
      toast(lang === "vi" ? "Đã copy" : "Copied");
    } catch {
      toast("Copy failed");
    }
  };

  const feeAmount = midResult != null && result != null ? Math.max(0, midResult - result) : 0;

  return (
    <div className="fp-tool xc-tool">
      {(isFallback || err) && !loading && (
        <>
          {isFallback && (
            <Alert tone="warning" title={t("xc_stale_title")}>
              {data.note ?? t("xc_stale_msg")}
            </Alert>
          )}
          {err && !isFallback && (
            <Alert tone="danger" title={t("xc_err_title")}>
              {err}
            </Alert>
          )}
        </>
      )}

      <Card variant="outline" padding="md" className="xc-main">
        {/* Status strip inside card head */}
        <div className="xc-head">
          <div className="xc-head-left">
            <Badge variant="dot" tone={isFallback ? "warning" : "success"}>
              {isFallback ? t("xc_mode_fallback") : t("xc_mode_live")}
            </Badge>
            {relative && (
              <span className="xc-head-updated" title={fmtDateTime(data.updatedAt)}>
                <IconClockHour4 size={11} stroke={2} /> {relative}
              </span>
            )}
            <a
              href="https://www.exchangerate-api.com"
              target="_blank"
              rel="noreferrer"
              className="xc-head-src"
            >
              open.er-api <IconExternalLink size={11} />
            </a>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load()}
            loading={loading}
            leftIcon={!loading ? <IconRefresh size={13} stroke={1.9} /> : undefined}
          >
            {t("xc_refresh")}
          </Button>
        </div>

        <div className="xc-grid">
          {/* LEFT — inputs */}
          <div className="xc-side xc-side-in">
            <div className="xc-amt-wrap">
              <span className="xc-amt-cur">{fromMeta?.symbol}</span>
              <input
                className="xc-amt"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                aria-label="Amount"
              />
              <span className="xc-amt-code">{from}</span>
            </div>

            <div className="xc-pair">
              <label className="xc-pair-slot">
                <span className="xc-pair-lbl">{t("xc_from")}</span>
                <CurrencySelect value={from} onChange={setFrom} ariaLabel={t("xc_from")} />
              </label>
              <button type="button" className="xc-swap" onClick={swap} aria-label={t("xc_swap")}>
                <IconArrowsLeftRight size={14} stroke={2} />
              </button>
              <label className="xc-pair-slot">
                <span className="xc-pair-lbl">{t("xc_to")}</span>
                <CurrencySelect value={to} onChange={setTo} ariaLabel={t("xc_to")} />
              </label>
            </div>

            <label className="xc-transfer">
              <input
                type="checkbox"
                checked={isTransfer}
                onChange={(e) => setIsTransfer(e.target.checked)}
              />
              <span className="xc-transfer-title">
                <IconSend size={12} stroke={2} /> {t("xc_transfer")}
                <span className="xc-transfer-hint">~1.2% + $2</span>
              </span>
            </label>
          </div>

          {/* RIGHT — result */}
          <div className="xc-side xc-side-out">
            <div className="xc-out-head">
              <span className="xc-out-lbl">{t("xc_result")}</span>
              <button type="button" className="xc-copy" onClick={copyResult} aria-label="Copy">
                <IconCopy size={12} stroke={1.9} /> Copy
              </button>
            </div>
            <div className="xc-out-value">
              {result == null ? "—" : fmtAmount(result, to)}
              <span className="xc-out-code">{to}</span>
            </div>

            <div className="xc-rates">
              <div className="xc-rates-row">
                <span>1 {from}</span>
                <b>{rate == null ? "—" : `${fmtRate(rate)} ${to}`}</b>
              </div>
              <div className="xc-rates-row">
                <span>1 {to}</span>
                <b>{inverse == null ? "—" : `${fmtRate(inverse)} ${from}`}</b>
              </div>
              {isTransfer && result != null && (
                <div className="xc-rates-row xc-rates-fee">
                  <span>{t("xc_fee")}</span>
                  <b>
                    −{fmtAmount(feeAmount, to)} {to}
                  </b>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QUICK PAIRS as inline chip strip */}
        <div className="xc-quick-strip">
          <span className="xc-quick-lbl">{t("xc_quick")}:</span>
          {QUICK_PAIRS.map(([f, tCode]) => {
            const r = crossRate(f, tCode, data.rates);
            const active = f === from && tCode === to;
            return (
              <button
                key={`${f}-${tCode}`}
                type="button"
                className={`xc-chip${active ? " on" : ""}`}
                onClick={() => {
                  setFrom(f);
                  setTo(tCode);
                }}
                title={r == null ? "" : `1 ${f} = ${fmtRate(r)} ${tCode}`}
              >
                {f}
                <IconArrowsLeftRight size={10} stroke={2} />
                {tCode}
                <b>{r == null ? "—" : fmtRate(r)}</b>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="xc-foot">
        <IconInfoCircle size={12} />
        <span>
          {t("xc_note")}{" "}
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">
            open.er-api
          </a>
          {" · "}
          {toMeta?.name[lang]} ↔ {fromMeta?.name[lang]}
          {" · "}
          {t("xc_note_updated")}: <b>{fmtDateTime(data.updatedAt)}</b>
        </span>
      </div>
    </div>
  );
}
