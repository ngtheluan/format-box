"use client";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconActivity,
  IconArrowDown,
  IconArrowUp,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconServer,
  IconWaveSine,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

async function measurePing(
  signal: AbortSignal,
  onSample: (v: number) => void,
): Promise<{ ping: number; jitter: number }> {
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
      try {
        await reader.cancel();
      } catch {}
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
        await downloadStream(`${DOWN_URL}?bytes=${DOWN_CHUNK_BYTES}&r=${Math.random()}`, signal, (n) => {
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
        });
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

function uploadOnce(
  payload: Blob,
  signal: AbortSignal,
  onDelta: (bytes: number) => void,
): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let lastLoaded = 0;
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.open("POST", `${UP_URL}?bytes=${payload.size}&r=${Math.random()}`, true);
    xhr.upload.onprogress = (e) => {
      const delta = e.loaded - lastLoaded;
      lastLoaded = e.loaded;
      if (delta > 0) onDelta(delta);
    };
    const finish = (ok: boolean, status: number) => {
      signal.removeEventListener("abort", abort);
      resolve({ ok, status });
    };
    xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 400, xhr.status);
    xhr.onerror = () => {
      if (typeof console !== "undefined") console.warn("[speed-test] upload error", xhr.status, xhr.responseURL);
      finish(false, xhr.status || 0);
    };
    xhr.onabort = () => finish(false, 0);
    xhr.ontimeout = () => finish(false, 0);
    try {
      xhr.send(payload);
    } catch (err) {
      if (typeof console !== "undefined") console.warn("[speed-test] xhr.send threw", err);
      finish(false, 0);
    }
  });
}

async function measureUpload(
  signal: AbortSignal,
  onLiveMbps: (mbps: number) => void,
): Promise<{ bps: number; failed: boolean }> {
  const rand = new Uint8Array(UP_CHUNK_BYTES);
  for (let i = 0; i < rand.length; i += 4096) rand[i] = (Math.random() * 256) | 0;
  const payload = new Blob([rand]);

  let bytesInWindow = 0;
  let windowStart = 0;
  let started = false;
  let anyOk = false;
  let anyProgress = false;
  const startAll = performance.now();

  const runner = async () => {
    while (!signal.aborted && performance.now() - startAll < UP_DURATION_MS + UP_WARMUP_MS) {
      const res = await uploadOnce(payload, signal, (delta) => {
        anyProgress = true;
        const now = performance.now();
        if (now - startAll < UP_WARMUP_MS) return;
        if (!started) {
          started = true;
          windowStart = now;
          bytesInWindow = 0;
          return;
        }
        bytesInWindow += delta;
        const w = (now - windowStart) / 1000;
        if (w > 0.2) onLiveMbps((bytesInWindow * 8) / w / 1_000_000);
      });
      if (res.ok) anyOk = true;
    }
  };

  const workers = Array.from({ length: UP_PARALLEL }, () => runner());
  await Promise.race([
    Promise.all(workers),
    new Promise<void>((r) => setTimeout(r, UP_DURATION_MS + UP_WARMUP_MS + 500)),
  ]);
  const elapsedSec = (performance.now() - windowStart) / 1000;
  if (!started || elapsedSec <= 0) {
    return { bps: 0, failed: !anyOk && !anyProgress };
  }
  return { bps: (bytesInWindow * 8) / elapsedSec, failed: false };
}

function Gauge({
  value,
  max,
  label,
  color,
  active,
  done,
  Icon,
  gradId,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
  active: boolean;
  done: boolean;
  Icon: typeof IconArrowDown;
  gradId: string;
}) {
  const clamped = Math.max(0, Math.min(value, max));
  const ratio = clamped / max;
  const R = 66;
  const CX = 84;
  const CY = 84;
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
    <div className={`st-gauge ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
      <svg viewBox="0 0 168 160" width="100%" style={{ display: "block" }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.65" />
          </linearGradient>
        </defs>
        <path d={track} fill="none" stroke="var(--border)" strokeWidth={8} strokeLinecap="round" />
        <path
          d={fill}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={8}
          strokeLinecap="round"
          style={{
            transition: "d 300ms ease-out",
            filter: active ? `drop-shadow(0 0 8px ${color})` : "none",
            opacity: value > 0 ? 1 : 0.25,
          }}
        />
        <text
          x={CX}
          y={CY + 4}
          textAnchor="middle"
          fontSize={30}
          fontWeight={700}
          fill="var(--text)"
          style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
        >
          {fmtSpeed(value * 1_000_000)}
        </text>
        <text
          x={CX}
          y={CY + 22}
          textAnchor="middle"
          fontSize={9}
          fontWeight={600}
          fill="var(--text)"
          opacity={0.5}
          letterSpacing={2}
        >
          MBPS
        </text>
      </svg>
      <div className="st-gauge-label">
        <span className="st-gauge-dot" style={{ background: color }} />
        <Icon size={13} stroke={2.2} style={{ color }} />
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
  const [uploadFailed, setUploadFailed] = useState(false);
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
    setUploadFailed(false);

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
    const { bps: up, failed: upFailed } = await measureUpload(ctrl.signal, (mbps) => setLiveUp(mbps));
    if (ctrl.signal.aborted) return;
    setResult((r) => ({ ...r, upload: up }));
    setLiveUp(up / 1_000_000);
    setUploadFailed(upFailed);

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
              <span className="st-muted">{t("st_server_loading")}</span>
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
            <Button variant="subtle" onClick={stop} leftIcon={<IconPlayerStopFilled size={13} stroke={1.9} />}>
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
          done={result.download != null}
          Icon={IconArrowDown}
          gradId="stGradDown"
        />
        <Gauge
          value={upMbps}
          max={maxUp}
          label={t("st_upload")}
          color="#a78bfa"
          active={phase === "upload"}
          done={result.upload != null}
          Icon={IconArrowUp}
          gradId="stGradUp"
        />

        <div className="st-side">
          <div className="st-stat">
            <div className="st-stat-icon">
              <IconActivity size={14} stroke={2} />
            </div>
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
            <div className="st-stat-icon">
              <IconWaveSine size={14} stroke={2} />
            </div>
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

      {uploadFailed && <p className="st-warn">{t("st_upload_failed")}</p>}
      <p className="st-note">{t("st_note")}</p>
    </div>
  );
}
