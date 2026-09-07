"use client";
import { useEffect, useMemo, useState } from "react";
import {
  IconCopy,
  IconRefresh,
  IconArrowsExchange,
  IconClockPlay,
} from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { Button, Input, Select } from "@/components/ui";

type Unit = "s" | "ms";

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

function tzOffsetString(d: Date) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

function formatLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatUTC(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function relativeTime(fromMs: number, nowMs: number, lang: "vi" | "en") {
  const diff = nowMs - fromMs;
  const abs = Math.abs(diff);
  const sec = Math.round(abs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const mo = Math.round(day / 30);
  const yr = Math.round(day / 365);
  const past = diff >= 0;
  const pick = (n: number, one: [string, string], many: [string, string]) => {
    const unit = lang === "vi" ? one[0] : n === 1 ? one[1] : many[1];
    if (lang === "vi") return past ? `${n} ${unit} trước` : `còn ${n} ${unit}`;
    return past ? `${n} ${unit} ago` : `in ${n} ${unit}`;
  };
  if (sec < 45) return lang === "vi" ? (past ? "vài giây trước" : "sắp tới") : past ? "just now" : "in a moment";
  if (min < 60) return pick(min, ["phút", "minute"], ["phút", "minutes"]);
  if (hr < 24) return pick(hr, ["giờ", "hour"], ["giờ", "hours"]);
  if (day < 30) return pick(day, ["ngày", "day"], ["ngày", "days"]);
  if (mo < 12) return pick(mo, ["tháng", "month"], ["tháng", "months"]);
  return pick(yr, ["năm", "year"], ["năm", "years"]);
}

function parseInputToMs(raw: string, unit: Unit): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return unit === "s" ? n * 1000 : n;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

export default function TimestampTool() {
  const toast = useToast();
  const { t, lang } = useI18n();

  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number>(0);
  const [live, setLive] = useState(true);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    setTsInput(String(Math.floor(Date.now() / 1000)));
    setDateInput(toLocalInput(new Date()));
  }, []);

  useEffect(() => {
    if (!live || !mounted) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live, mounted]);

  const [tsInput, setTsInput] = useState<string>("");
  const [unit, setUnit] = useState<Unit>("s");
  const parsedMs = useMemo(() => parseInputToMs(tsInput, unit), [tsInput, unit]);
  const parsedDate = useMemo(
    () => (parsedMs != null ? new Date(parsedMs) : null),
    [parsedMs],
  );
  const validParsed = parsedDate && !Number.isNaN(parsedDate.getTime());

  const [dateInput, setDateInput] = useState<string>("");
  const dateMs = useMemo(() => {
    if (!dateInput) return null;
    const t = new Date(dateInput).getTime();
    return Number.isFinite(t) ? t : null;
  }, [dateInput]);

  const copy = (v: string) => {
    if (!v) return;
    navigator.clipboard.writeText(v).then(() => toast(t("toast_copied")));
  };

  const nowDate = useMemo(() => new Date(now), [now]);

  const nowCards = useMemo(
    () => [
      { key: "s", title: t("ts_unix_s"), sub: t("ts_unix_s_sub"), value: String(Math.floor(now / 1000)) },
      { key: "ms", title: t("ts_unix_ms"), sub: t("ts_unix_ms_sub"), value: String(now) },
      { key: "iso", title: "ISO 8601", sub: t("ts_iso_sub"), value: nowDate.toISOString() },
      { key: "local", title: t("ts_local"), sub: `UTC${tzOffsetString(nowDate)}`, value: formatLocal(nowDate) },
      { key: "utc", title: "UTC", sub: t("ts_utc_sub"), value: formatUTC(nowDate) },
      { key: "rfc", title: "RFC 2822", sub: t("ts_rfc_sub"), value: nowDate.toUTCString() },
    ],
    [now, nowDate, t],
  );

  const outCards = useMemo(() => {
    if (!parsedDate || !validParsed) return null;
    return [
      { key: "s", title: t("ts_unix_s"), value: String(Math.floor(parsedDate.getTime() / 1000)) },
      { key: "ms", title: t("ts_unix_ms"), value: String(parsedDate.getTime()) },
      { key: "iso", title: "ISO 8601", value: parsedDate.toISOString() },
      { key: "local", title: `${t("ts_local")} (UTC${tzOffsetString(parsedDate)})`, value: formatLocal(parsedDate) },
      { key: "utc", title: "UTC", value: formatUTC(parsedDate) },
      { key: "rel", title: t("ts_relative"), value: relativeTime(parsedDate.getTime(), now, lang) },
    ];
  }, [parsedDate, validParsed, t, now, lang]);

  const dateOutCards = useMemo(() => {
    if (dateMs == null) return null;
    const d = new Date(dateMs);
    return [
      { key: "s", title: t("ts_unix_s"), value: String(Math.floor(dateMs / 1000)) },
      { key: "ms", title: t("ts_unix_ms"), value: String(dateMs) },
      { key: "iso", title: "ISO 8601", value: d.toISOString() },
      { key: "utc", title: "UTC", value: formatUTC(d) },
    ];
  }, [dateMs, t]);

  const useNow = () => {
    const n = Date.now();
    setTsInput(unit === "s" ? String(Math.floor(n / 1000)) : String(n));
  };

  const autoDetectUnit = () => {
    const s = tsInput.trim();
    if (!/^-?\d+$/.test(s)) return;
    const n = Number(s);
    setUnit(Math.abs(n) >= 1e12 ? "ms" : "s");
  };

  if (!mounted) return <div className="tc-tool" />;

  return (
    <div className="tc-tool">
      <div className="tc-input-wrap">
        <label>
          <IconClockPlay size={14} stroke={1.9} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          {t("ts_current")}
          <span className="info-i" style={{ marginLeft: 10, fontWeight: 500, fontSize: 12 }}>
            UTC{tzOffsetString(nowDate)} · {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </span>
        </label>
        <div className="actions" style={{ marginTop: 8 }}>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setLive((v) => !v)}
            leftIcon={<IconRefresh size={14} stroke={1.9} />}
          >
            {live ? t("ts_pause") : t("ts_resume")}
          </Button>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setNow(Date.now())}
            leftIcon={<IconRefresh size={14} stroke={1.9} />}
          >
            {t("ts_refresh")}
          </Button>
        </div>
      </div>

      <div className="tc-grid">
        {nowCards.map((r) => (
          <button
            key={r.key}
            className="tc-card"
            onClick={() => copy(r.value)}
            type="button"
            title={t("tc_click_copy")}
          >
            <div className="tc-card-head">
              <div className="tc-card-name">
                <b>{r.title}</b>
                <span>{r.sub}</span>
              </div>
              <IconCopy size={14} stroke={1.9} className="tc-card-copy" />
            </div>
            <div className="tc-card-value">{r.value || <em>—</em>}</div>
          </button>
        ))}
      </div>

      <div className="tc-input-wrap">
        <label>{t("ts_convert_ts")}</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          <Input
            style={{ flex: "1 1 260px", minWidth: 220 }}
            value={tsInput}
            onChange={(e) => setTsInput(e.target.value)}
            onBlur={autoDetectUnit}
            placeholder={t("ts_convert_ts_ph")}
            spellCheck={false}
          />
          <Select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            options={[
              { value: "s", label: t("ts_unit_s") },
              { value: "ms", label: t("ts_unit_ms") },
            ]}
          />
          <Button
            size="sm"
            variant="subtle"
            onClick={useNow}
            leftIcon={<IconClockPlay size={14} stroke={1.9} />}
          >
            {t("ts_use_now")}
          </Button>
          <Button
            size="sm"
            variant="subtle"
            onClick={autoDetectUnit}
            leftIcon={<IconArrowsExchange size={14} stroke={1.9} />}
          >
            {t("ts_auto_unit")}
          </Button>
        </div>
        {tsInput.trim() && !validParsed && (
          <p className="info" style={{ color: "var(--danger, #ef4444)", marginTop: 8 }}>
            {t("ts_invalid")}
          </p>
        )}
      </div>

      {outCards && (
        <div className="tc-grid">
          {outCards.map((r) => (
            <button
              key={r.key}
              className="tc-card"
              onClick={() => copy(r.value)}
              type="button"
              title={t("tc_click_copy")}
            >
              <div className="tc-card-head">
                <div className="tc-card-name">
                  <b>{r.title}</b>
                </div>
                <IconCopy size={14} stroke={1.9} className="tc-card-copy" />
              </div>
              <div className="tc-card-value">{r.value || <em>—</em>}</div>
            </button>
          ))}
        </div>
      )}

      <div className="tc-input-wrap">
        <label>{t("ts_convert_date")}</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          <Input
            type="datetime-local"
            step={1}
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            style={{ flex: "1 1 260px", minWidth: 220 }}
          />
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setDateInput(toLocalInput(new Date()))}
            leftIcon={<IconClockPlay size={14} stroke={1.9} />}
          >
            {t("ts_use_now")}
          </Button>
        </div>
      </div>

      {dateOutCards && (
        <div className="tc-grid">
          {dateOutCards.map((r) => (
            <button
              key={r.key}
              className="tc-card"
              onClick={() => copy(r.value)}
              type="button"
              title={t("tc_click_copy")}
            >
              <div className="tc-card-head">
                <div className="tc-card-name">
                  <b>{r.title}</b>
                </div>
                <IconCopy size={14} stroke={1.9} className="tc-card-copy" />
              </div>
              <div className="tc-card-value">{r.value || <em>—</em>}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
