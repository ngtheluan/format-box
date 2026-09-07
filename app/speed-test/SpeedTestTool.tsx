"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconArrowDown,
  IconArrowUp,
  IconActivity,
  IconWaveSine,
  IconServer,
} from "@tabler/icons-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui";

type Phase = "idle" | "ping" | "download" | "upload" | "done";

type Result = {
  ping: number | null;
  jitter: number | null;
  download: number | null;
  upload: number | null;
};

const DOWN_URL = "https://speed.cloudflare.com/__down";
const UP_URL = "https://speed.cloudflare.com/__up";
const META_URL = "https://speed.cloudflare.com/meta";

const PING_COUNT = 20;
const DOWN_PARALLEL = 6;
const DOWN_CHUNK_BYTES = 25_000_000;
const DOWN_DURATION_MS = 10_000;
const DOWN_WARMUP_MS = 2_000;
const UP_PARALLEL = 4;
const UP_CHUNK_BYTES = 8_000_000;
const UP_DURATION_MS = 10_000;
const UP_WARMUP_MS = 2_000;

function fmtSpeed(bps: number | null): string {
  if (bps == null || !isFinite(bps) || bps <= 0) return "0";
  const mbps = bps / 1_000_000;
  if (mbps >= 100) return mbps.toFixed(0);
  if (mbps >= 10) return mbps.toFixed(1);
  return mbps.toFixed(2);
}

function median(arr: number[]): number {
  const a = [...arr].sort((x, y) => x - y);
  const n = a.length;
  if (n === 0) return 0;
  return n % 2 ? a[(n - 1) >> 1] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

async function measurePing(signal: AbortSignal, onSample: (v: number) => void): Promise<{ ping: number; jitter: number }> {
  const samples: number[] = [];
  for (let i = 0; i < PING_COUNT; i++) {
    if (signal.aborted) break;
    const t0 = performance.now();
    try {
      await fetch(`${DOWN_URL}?bytes=0&r=${Math.random()}`, { cache: "no-store", signal });
      samples.push(performance.now() - t0);
      onSample(performance.now() - t0);
    } catch {}
  }
  if (samples.length === 0) return { ping: 0, jitter: 0 };
  const p = median(samples);
  const diffs: number[] = [];
  for (let i = 1; i < samples.length; i++) diffs.push(Math.abs(samples[i] - samples[i - 1]));
  const j = diffs.length ? diffs.reduce((s, v) => s + v, 0) / diffs.length : 0;
  return { ping: p, jitter: j };
}

async function downloadStream(url: string, signal: AbortSignal, onBytes: (n: number) => void): Promise<void> {
  const res = await fetch(url, { cache: "no-store", signal });
  if (!res.body) {
    const buf = await res.arrayBuffer();
    onBytes(buf.byteLength);
    return;
  }
  const reader = res.body.getReader();
  while (true) {
    if (signal.aborted) {
      try { await reader.cancel(); } catch {}
      return;
    }
    const { done, value } = await reader.read();
    if (done) return;
    if (value) onBytes(value.byteLength);
  }
}

async function measureDownload(signal: AbortSignal, onLiveMbps: (mbps: number) => void): Promise<number> {
  let bytesInWindow = 0;
  let windowStart = 0;
  let started = false;
  const startAll = performance.now();

  const runner = async () => {
    while (!signal.aborted && performance.now() - startAll < DOWN_DURATION_MS + DOWN_WARMUP_MS) {
      try {
        await downloadStream(
          `${DOWN_URL}?bytes=${DOWN_CHUNK_BYTES}&r=${Math.random()}`,
          signal,
          (n) => {
            const now = performance.now();
            const elapsed = now - startAll;
            if (elapsed >= DOWN_WARMUP_MS) {
              if (!started) {
                started = true;
                windowStart = now;
                bytesInWindow = 0;
              }
              bytesInWindow += n;
              const w = (now - windowStart) / 1000;
              if (w > 0.2) onLiveMbps((bytesInWindow * 8) / w / 1_000_000);
            }
          },
        );
      } catch {}
    }
  };

  const workers = Array.from({ length: DOWN_PARALLEL }, () => runner());
  await Promise.race([
    Promise.all(workers),
    new Promise<void>((r) => setTimeout(r, DOWN_DURATION_MS + DOWN_WARMUP_MS + 500)),
  ]);
  const elapsedSec = (performance.now() - windowStart) / 1000;
  if (!started || elapsedSec <= 0) return 0;
  return (bytesInWindow * 8) / elapsedSec;
}

async function measureUpload(signal: AbortSignal, onLiveMbps: (mbps: number) => void): Promise<number> {
  const payload = new Uint8Array(UP_CHUNK_BYTES);
  for (let i = 0; i < payload.length; i += 4096) payload[i] = (Math.random() * 256) | 0;

  let bytesInWindow = 0;
  let windowStart = 0;
  let started = false;
  const startAll = performance.now();

  const runner = async () => {
    while (!signal.aborted && performance.now() - startAll < UP_DURATION_MS + UP_WARMUP_MS) {
      const t0 = performance.now();
      try {
        await fetch(UP_URL, {
          method: "POST",
          body: payload,
          cache: "no-store",
          signal,
          headers: { "Content-Type": "application/octet-stream" },
        });
        const t1 = performance.now();
        const dt = t1 - t0;
        if (t1 - startAll >= UP_WARMUP_MS) {
          if (!started) {
            started = true;
            windowStart = t1 - dt;
            bytesInWindow = 0;
          }
          bytesInWindow += UP_CHUNK_BYTES;
          const w = (t1 - windowStart) / 1000;
          if (w > 0.2) onLiveMbps((bytesInWindow * 8) / w / 1_000_000);
        }
      } catch {}
    }
  };

  const workers = Array.from({ length: UP_PARALLEL }, () => runner());
  await Promise.race([
    Promise.all(workers),
    new Promise<void>((r) => setTimeout(r, UP_DURATION_MS + UP_WARMUP_MS + 500)),
  ]);
  const elapsedSec = (performance.now() - windowStart) / 1000;
  if (!started || elapsedSec <= 0) return 0;
  return (bytesInWindow * 8) / elapsedSec;
}

function Gauge({
  value,
  max,
  label,
  color,
  active,
  Icon,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
  active: boolean;
  Icon: typeof IconArrowDown;
}) {
  const clamped = Math.max(0, Math.min(value, max));
  const ratio = clamped / max;
  const R = 62;
  const CX = 80;
  const CY = 80;
  const start = Math.PI * 0.75;
  const end = Math.PI * 2.25;
  const ang = start + (end - start) * ratio;
  const x1 = CX + R * Math.cos(start);
  const y1 = CY + R * Math.sin(start);
  const x2 = CX + R * Math.cos(end);
  const y2 = CY + R * Math.sin(end);
  const xN = CX + R * Math.cos(ang);
  const yN = CY + R * Math.sin(ang);
  const largeArc = ang - start > Math.PI ? 1 : 0;
  const track = `M ${x1} ${y1} A ${R} ${R} 0 1 1 ${x2} ${y2}`;
  const fill = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${xN} ${yN}`;
  return (
    <div className="st-gauge">
      <div className="st-gauge-svg">
        <svg viewBox="0 0 160 155" width="100%" style={{ display: "block" }}>
          <path d={track} fill="none" stroke="var(--border)" strokeWidth={9} strokeLinecap="round" />
          <path
            d={fill}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeLinecap="round"
            style={{
              transition: "d 250ms ease-out",
              filter: active ? `drop-shadow(0 0 6px ${color})` : "none",
              opacity: value > 0 ? 1 : 0.35,
            }}
          />
          <text
            x={CX}
            y={CY + 4}
            textAnchor="middle"
            fontSize={28}
            fontWeight={700}
            fill="var(--text)"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {fmtSpeed(value * 1_000_000)}
          </text>
          <text
            x={CX}
            y={CY + 22}
            textAnchor="middle"
            fontSize={10}
            fontWeight={500}
            fill="var(--text)"
            opacity={0.55}
            letterSpacing={1.5}
          >
            Mbps
          </text>
        </svg>
      </div>
      <div className="st-gauge-label">
        <Icon size={14} stroke={2} style={{ color }} />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function SpeedTestTool() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result>({ ping: null, jitter: null, download: null, upload: null });
  const [liveDown, setLiveDown] = useState(0);
  const [liveUp, setLiveUp] = useState(0);
  const [livePing, setLivePing] = useState<number | null>(null);
  const [server, setServer] = useState<{ city?: string; country?: string; ip?: string; colo?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pickStr = (v: unknown, ...keys: string[]): string | undefined => {
    if (v == null) return undefined;
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      for (const k of keys) {
        const x = (v as Record<string, unknown>)[k];
        if (typeof x === "string" && x) return x;
      }
    }
    return undefined;
  };

  useEffect(() => {
    let cancel = false;
    fetch(META_URL, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancel) return;
        setServer({
          city: pickStr(j.city, "name") || pickStr(j.colo, "city"),
          country: pickStr(j.country, "name") || pickStr(j.colo, "cca2"),
          ip: pickStr(j.clientIp) || pickStr(j.ip),
          colo: pickStr(j.colo, "iata", "code", "name"),
        });
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
  }, []);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setResult({ ping: null, jitter: null, download: null, upload: null });
    setLiveDown(0);
    setLiveUp(0);
    setLivePing(null);

    setPhase("ping");
    const { ping, jitter } = await measurePing(ctrl.signal, (v) => setLivePing(v));
    if (ctrl.signal.aborted) return;
    setResult((r) => ({ ...r, ping, jitter }));

    setPhase("download");
    setLiveDown(0);
    const down = await measureDownload(ctrl.signal, (mbps) => setLiveDown(mbps));
    if (ctrl.signal.aborted) return;
    setResult((r) => ({ ...r, download: down }));
    setLiveDown(down / 1_000_000);

    setPhase("upload");
    setLiveUp(0);
    const up = await measureUpload(ctrl.signal, (mbps) => setLiveUp(mbps));
    if (ctrl.signal.aborted) return;
    setResult((r) => ({ ...r, upload: up }));
    setLiveUp(up / 1_000_000);

    setPhase("done");
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const running = phase !== "idle" && phase !== "done";
  const downMbps = result.download != null ? result.download / 1_000_000 : liveDown;
  const upMbps = result.upload != null ? result.upload / 1_000_000 : liveUp;
  const maxDown = Math.max(100, Math.ceil((downMbps || 0) / 50) * 50);
  const maxUp = Math.max(50, Math.ceil((upMbps || 0) / 25) * 25);

  const phaseLabel: Record<Phase, string> = {
    idle: t("st_idle"),
    ping: t("st_ping") + "…",
    download: t("st_download") + "…",
    upload: t("st_upload") + "…",
    done: t("st_done"),
  };

  return (
    <div className="st-tool">
      <div className="st-bar">
        <div className="st-server">
          <IconServer size={14} stroke={1.9} />
          <span className="st-server-txt">
            {server ? (
              <>
                <b>Cloudflare</b>
                {server.colo && <span className="st-dot">·</span>}
                {server.colo && <span>{server.colo}</span>}
                {server.city && <span className="st-dot">·</span>}
                {server.city && <span>{server.city}</span>}
                {server.country && <span className="st-country">{server.country}</span>}
              </>
            ) : (
              <span className="muted">{t("st_server_loading")}</span>
            )}
          </span>
          {server?.ip && <code className="st-ip">{server.ip}</code>}
        </div>
        <div className="st-actions">
          <span className={`st-phase st-phase-${phase}`}>{phaseLabel[phase]}</span>
          {!running ? (
            <Button onClick={run} leftIcon={<IconPlayerPlayFilled size={13} stroke={1.9} />}>
              {phase === "done" ? t("st_run_again") : t("st_start")}
            </Button>
          ) : (
            <Button
              variant="subtle"
              onClick={stop}
              leftIcon={<IconPlayerStopFilled size={13} stroke={1.9} />}
            >
              {t("st_stop")}
            </Button>
          )}
        </div>
      </div>

      <div className="st-main">
        <Gauge
          value={downMbps}
          max={maxDown}
          label={t("st_download")}
          color="#6366f1"
          active={phase === "download"}
          Icon={IconArrowDown}
        />
        <Gauge
          value={upMbps}
          max={maxUp}
          label={t("st_upload")}
          color="#a78bfa"
          active={phase === "upload"}
          Icon={IconArrowUp}
        />

        <div className="st-side">
          <div className="st-stat">
            <div className="st-stat-icon"><IconActivity size={14} stroke={2} /></div>
            <div className="st-stat-body">
              <div className="st-stat-label">{t("st_ping")}</div>
              <div className="st-stat-value">
                {result.ping != null
                  ? result.ping.toFixed(0)
                  : livePing != null && phase === "ping"
                  ? livePing.toFixed(0)
                  : "—"}
                <em>ms</em>
              </div>
            </div>
          </div>
          <div className="st-stat">
            <div className="st-stat-icon"><IconWaveSine size={14} stroke={2} /></div>
            <div className="st-stat-body">
              <div className="st-stat-label">{t("st_jitter")}</div>
              <div className="st-stat-value">
                {result.jitter != null ? result.jitter.toFixed(1) : "—"}
                <em>ms</em>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="st-note">{t("st_note")}</p>

      <style jsx>{`
        .st-tool {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .st-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 10px 14px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
        }
        .st-server {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text);
          flex-wrap: wrap;
          min-width: 0;
        }
        .st-server-txt {
          display: inline-flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }
        .st-dot { opacity: 0.4; }
        .st-country {
          font-size: 11px;
          padding: 1px 6px;
          border: 1px solid var(--border);
          border-radius: 20px;
          opacity: 0.7;
        }
        .st-ip {
          font-family: ui-monospace, Menlo, monospace;
          font-size: 11px;
          padding: 2px 6px;
          background: var(--bg3);
          border-radius: 5px;
          opacity: 0.7;
        }
        .muted { opacity: 0.6; }
        .st-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .st-phase {
          font-size: 12px;
          opacity: 0.65;
          font-variant-numeric: tabular-nums;
        }
        .st-phase-ping,
        .st-phase-download,
        .st-phase-upload {
          color: var(--accent);
          opacity: 1;
        }
        .st-phase-done { color: #10b981; opacity: 1; }

        .st-main {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 14px;
          align-items: stretch;
          padding: 16px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 14px;
        }
        @media (max-width: 720px) {
          .st-main {
            grid-template-columns: 1fr 1fr;
          }
        }
        .st-gauge {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          min-width: 0;
        }
        .st-gauge-svg {
          width: 100%;
          max-width: 200px;
        }
        .st-gauge-label {
          display: inline-flex;
          gap: 6px;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--text);
          opacity: 0.7;
        }
        .st-side {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 10px;
          min-width: 140px;
        }
        @media (max-width: 720px) {
          .st-side {
            grid-column: 1 / -1;
            flex-direction: row;
          }
          .st-side .st-stat { flex: 1; }
        }
        .st-stat {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 10px 12px;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .st-stat-icon {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: var(--bg4);
          color: var(--accent);
        }
        .st-stat-body { min-width: 0; }
        .st-stat-label {
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          opacity: 0.55;
          color: var(--text);
        }
        .st-stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          font-variant-numeric: tabular-nums;
          line-height: 1.2;
        }
        .st-stat-value em {
          font-style: normal;
          font-size: 11px;
          font-weight: 500;
          opacity: 0.55;
          margin-left: 3px;
        }
        .st-note {
          font-size: 11px;
          opacity: 0.55;
          text-align: center;
          color: var(--text);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
