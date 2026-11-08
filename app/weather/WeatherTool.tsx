"use client";
import { Alert, Button, IconButton, Input, Skeleton } from "@/components/ui";
import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
  IconClock,
  IconCloud,
  IconCloudRain,
  IconCloudSnow,
  IconCloudStorm,
  IconCurrentLocation,
  IconDroplet,
  IconDroplets,
  IconEye,
  IconGauge,
  IconMapPin,
  IconMist,
  IconMoon,
  IconRadar2,
  IconRefresh,
  IconSearch,
  IconSun,
  IconSunrise,
  IconSunset,
  IconTemperature,
  IconUmbrella,
  IconWind,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { applyObservation, type Forecast, type ForecastDaily, type Observation } from "@/lib/weather-obs";

type GeoResult = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

type Loaded = { forecast: Forecast; observation: Observation | null };
type Lang = "vi" | "en";
type Scene = "clear" | "cloud" | "rain" | "snow" | "storm" | "fog";

const WMO: Record<number, { key: string; icon: typeof IconSun; scene: Scene }> = {
  0: { key: "wt_w_clear", icon: IconSun, scene: "clear" },
  1: { key: "wt_w_mclear", icon: IconSun, scene: "clear" },
  2: { key: "wt_w_pcloud", icon: IconCloud, scene: "clear" },
  3: { key: "wt_w_cloud", icon: IconCloud, scene: "cloud" },
  45: { key: "wt_w_fog", icon: IconMist, scene: "fog" },
  48: { key: "wt_w_rfog", icon: IconMist, scene: "fog" },
  51: { key: "wt_w_drizl", icon: IconCloudRain, scene: "rain" },
  53: { key: "wt_w_drizm", icon: IconCloudRain, scene: "rain" },
  55: { key: "wt_w_drizh", icon: IconCloudRain, scene: "rain" },
  61: { key: "wt_w_rainl", icon: IconCloudRain, scene: "rain" },
  63: { key: "wt_w_rainm", icon: IconCloudRain, scene: "rain" },
  65: { key: "wt_w_rainh", icon: IconCloudRain, scene: "rain" },
  71: { key: "wt_w_snowl", icon: IconCloudSnow, scene: "snow" },
  73: { key: "wt_w_snowm", icon: IconCloudSnow, scene: "snow" },
  75: { key: "wt_w_snowh", icon: IconCloudSnow, scene: "snow" },
  80: { key: "wt_w_showl", icon: IconCloudRain, scene: "rain" },
  81: { key: "wt_w_showm", icon: IconCloudRain, scene: "rain" },
  82: { key: "wt_w_showh", icon: IconCloudRain, scene: "rain" },
  95: { key: "wt_w_storm", icon: IconCloudStorm, scene: "storm" },
  96: { key: "wt_w_stormh1", icon: IconCloudStorm, scene: "storm" },
  99: { key: "wt_w_stormh2", icon: IconCloudStorm, scene: "storm" },
};

function describe(code: number, isDay = true) {
  const d = WMO[code] ?? { key: "wt_w_unknown", icon: IconCloud, scene: "cloud" as Scene };
  return !isDay && d.icon === IconSun ? { ...d, icon: IconMoon } : d;
}

function iconColor(code: number, isDay: boolean) {
  const scene = describe(code).scene;
  if (scene === "clear") return code !== 2 && isDay ? "var(--wt-sun)" : "var(--wt-soft)";
  if (scene === "rain" || scene === "storm") return "var(--wt-rain)";
  return "var(--wt-soft)";
}

const sky = (a: string, b: string, c: string) => `linear-gradient(165deg, ${a} 0%, ${b} 55%, ${c} 100%)`;

const SKY: Record<Scene, [day: string, night: string]> = {
  clear: [sky("#0a3a8c", "#1257b0", "#1b6fc2"), sky("#070b24", "#141a4a", "#2a2a6e")],
  cloud: [sky("#3d4d63", "#4a5b72", "#5a6b80"), sky("#141c2b", "#1f2a3c", "#2b3850")],
  rain: [sky("#25344a", "#2c4260", "#36516f"), sky("#0e1626", "#16243c", "#1e3150")],
  storm: [sky("#1c1740", "#262050", "#141a33"), sky("#0c0a1f", "#15122e", "#0a0f20")],
  snow: [sky("#3a5885", "#4a6a96", "#5a7aa3"), sky("#1a2c4a", "#25395a", "#324a6c")],
  fog: [sky("#4b5866", "#59677a", "#66748a"), sky("#222c38", "#2d3948", "#3a4757")],
};
const GOLDEN_SKY = sky("#1c1b5a", "#5b2d7d", "#a8445f");
const GOLDEN_MINUTES = 40;

const repeat = (n: number) => Array.from({ length: n }, (_, i) => i);

function SkyLayer({ scene, isDay, cloudy }: { scene: Scene; isDay: boolean; cloudy: boolean }) {
  const showClouds = cloudy || scene === "cloud" || scene === "rain" || scene === "storm";
  const drops = scene === "rain" ? 40 : scene === "storm" ? 56 : 0;
  return (
    <div className="wt-layer" aria-hidden>
      {scene === "clear" && isDay && <div className="wt-glow" />}
      {scene === "clear" && !isDay && (
        <>
          <div className="wt-moon" />
          {repeat(44).map((i) => (
            <div
              key={i}
              className="wt-star"
              style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%`, animationDelay: `${(i % 5) * 0.5}s` }}
            />
          ))}
        </>
      )}
      {showClouds && (
        <>
          <div className="wt-cloud wt-cloud-1" />
          <div className="wt-cloud wt-cloud-2" />
          <div className="wt-cloud wt-cloud-3" />
        </>
      )}
      {repeat(drops).map((i) => (
        <div
          key={i}
          className="wt-drop"
          style={{
            left: `${(i * 2.7) % 100}%`,
            animationDelay: `${(i % 10) * 0.13}s`,
            animationDuration: `${0.8 + ((i * 13) % 40) / 100}s`,
          }}
        />
      ))}
      {scene === "storm" && <div className="wt-bolt" />}
      {scene === "snow" &&
        repeat(36).map((i) => (
          <div
            key={i}
            className="wt-flake"
            style={{
              left: `${(i * 2.9) % 100}%`,
              animationDelay: `${(i % 8) * -1.1}s`,
              animationDuration: `${6 + ((i * 7) % 40) / 10}s`,
            }}
          />
        ))}
      {scene === "fog" && (
        <>
          <div className="wt-fog wt-fog-1" />
          <div className="wt-fog wt-fog-2" />
          <div className="wt-fog wt-fog-3" />
        </>
      )}
    </div>
  );
}

const CSS = `
/* The panel sits on its own sky, so shared components are re-themed here. */
.wt-sky {
  --bg: rgba(6,14,34,.24);
  --bg2: rgba(6,14,34,.24);
  --bg3: rgba(255,255,255,.16);
  --bg4: rgba(255,255,255,.22);
  --text: #fff;
  --bright: #fff;
  --dim: rgba(255,255,255,.72);
  --border: rgba(255,255,255,.16);
  --accent: #fff;
  --wt-sun: #fcd34d;
  --wt-rain: #93c5fd;
  --wt-soft: rgba(255,255,255,.88);
  position: relative; isolation: isolate; color: #fff;
  display: flex; flex-direction: column; gap: 10px;
  padding: 14px; border-radius: 20px; overflow: hidden;
  transition: background .6s ease;
}
.wt-layer { position: absolute; inset: 0; overflow: hidden; z-index: -1; pointer-events: none; }

.wt-glass {
  background: rgba(6,14,34,.24);
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 14px;
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  backdrop-filter: blur(12px) saturate(140%);
}

.wt-bar { position: relative; z-index: 5; display: flex; gap: 6px; align-items: center; }
.wt-search { flex: 1; position: relative; min-width: 0; }
.wt-search .ui-input { border-radius: 999px; }
.wt-sky .ui-input-el::placeholder { color: rgba(255,255,255,.65); }
.wt-sky .ui-input:focus-within { box-shadow: 0 0 0 3px rgba(255,255,255,.14); }
.wt-sky .ui-iconbtn--subtle { background: rgba(6,14,34,.24); }
.wt-sky .ui-iconbtn--subtle:hover { background: rgba(255,255,255,.18); }
.wt-spin svg { animation: wt-rotate .9s linear infinite; }
.wt-suggest {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  display: flex; flex-direction: column; padding: 4px; max-height: 280px; overflow-y: auto;
  background: rgba(13,22,44,.97); border: 1px solid rgba(255,255,255,.14); border-radius: 14px;
  box-shadow: 0 16px 40px rgba(0,0,0,.4);
}
.wt-suggest .ui-btn { justify-content: flex-start; text-align: left; }
.wt-suggest-sub { color: rgba(255,255,255,.62); margin-left: 6px; font-weight: 400; }

.wt-grid { display: grid; grid-template-columns: minmax(280px, 340px) minmax(0, 1fr); gap: 10px; }
.wt-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
@media (max-width: 860px) { .wt-grid { grid-template-columns: minmax(0, 1fr); } }

.wt-hero { display: flex; flex-direction: column; gap: 4px; padding: 6px 6px 8px; }
.wt-place { display: flex; align-items: center; gap: 5px; min-width: 0; }
.wt-place b { font-size: 18px; font-weight: 600; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wt-clock { margin-left: auto; font-size: 12px; color: rgba(255,255,255,.75); white-space: nowrap; font-variant-numeric: tabular-nums; }
.wt-temp {
  font-size: clamp(88px, 10vw, 118px); font-weight: 200; line-height: 1; letter-spacing: -.05em;
  font-variant-numeric: tabular-nums; text-shadow: 0 6px 30px rgba(0,0,0,.18); margin-top: 6px;
}
.wt-cond { font-size: 19px; font-weight: 500; letter-spacing: -.01em; }
.wt-range { display: flex; align-items: center; gap: 10px; font-size: 13px; color: rgba(255,255,255,.88); font-variant-numeric: tabular-nums; }
.wt-range span { display: inline-flex; align-items: center; gap: 2px; }
.wt-source {
  display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; max-width: 100%; margin-top: 8px;
  padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 500;
  background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.18);
}

.wt-panel { padding: 10px 12px; }
.wt-head { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,.78); }
.wt-head-read { margin-left: auto; font-weight: 500; color: #fff; font-variant-numeric: tabular-nums; }

.wt-day {
  display: grid; grid-template-columns: 56px 20px 36px 26px minmax(36px, 1fr) 26px; align-items: center; gap: 6px;
  padding: 5px 6px; margin: 0 -6px; border-radius: 8px; font-size: 13px; font-variant-numeric: tabular-nums;
}
.wt-day--today { background: rgba(255,255,255,.1); }
.wt-day-name { font-weight: 600; white-space: nowrap; }
.wt-day-rain { display: inline-flex; align-items: center; gap: 1px; font-size: 11px; color: var(--wt-rain); }
.wt-day-lo { color: rgba(255,255,255,.65); text-align: right; }
.wt-day-hi { font-weight: 600; }
.wt-track { position: relative; height: 4px; border-radius: 999px; background: rgba(255,255,255,.18); }
.wt-fill { position: absolute; top: 0; bottom: 0; border-radius: 999px; background: rgba(255,255,255,.88); }
.wt-pin {
  position: absolute; top: 50%; width: 8px; height: 8px; border-radius: 50%; transform: translate(-50%, -50%);
  background: var(--wt-sun); box-shadow: 0 0 0 2px rgba(6,14,34,.55);
}

.wt-h-scroll { overflow-x: auto; scrollbar-width: none; }
.wt-h-scroll::-webkit-scrollbar { display: none; }
.wt-h-inner { position: relative; touch-action: pan-x; }
.wt-h-row { display: grid; position: relative; }
.wt-h-active { position: absolute; top: 0; bottom: 0; border-radius: 8px; background: rgba(255,255,255,.11); pointer-events: none; transition: left .12s ease-out; }
.wt-h-time { text-align: center; padding-top: 3px; font-size: 11px; color: rgba(255,255,255,.72); white-space: nowrap; font-variant-numeric: tabular-nums; }
.wt-h-time--now { color: #fff; font-weight: 600; font-size: 10px; }
.wt-h-icon { display: flex; justify-content: center; padding-top: 5px; }
.wt-h-plot { position: relative; height: 92px; }
.wt-h-plot svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.wt-h-label { position: absolute; transform: translate(-50%, calc(-100% - 7px)); font-size: 12.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.wt-h-dot { position: absolute; width: 9px; height: 9px; border-radius: 50%; transform: translate(-50%, -50%); background: #fff; box-shadow: 0 0 0 2px rgba(6,14,34,.5), 0 0 14px rgba(255,255,255,.7); }
.wt-h-bars { height: 24px; align-items: end; gap: 2px; padding: 0 3px; border-top: 1px solid rgba(255,255,255,.12); }
.wt-h-bar { background: var(--wt-rain); border-radius: 3px 3px 0 0; }
.wt-h-rainlbl { display: flex; align-items: center; gap: 4px; margin-top: 3px; font-size: 11px; color: rgba(255,255,255,.72); }

.wt-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
@media (max-width: 560px) { .wt-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.wt-metric { position: relative; display: flex; flex-direction: column; gap: 3px; min-width: 0; min-height: 88px; padding: 9px 11px; }
.wt-metric-lbl { display: flex; align-items: center; gap: 4px; font-size: 11px; color: rgba(255,255,255,.75); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wt-metric-val { font-size: 23px; font-weight: 500; line-height: 1.15; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.wt-metric-val small { font-size: 12px; font-weight: 400; letter-spacing: 0; color: rgba(255,255,255,.75); margin-left: 3px; }
.wt-metric-sub { margin-top: auto; font-size: 11px; color: rgba(255,255,255,.78); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wt-meter { margin-top: auto; height: 4px; border-radius: 999px; background: rgba(255,255,255,.18); overflow: hidden; }
.wt-meter span { display: block; height: 100%; border-radius: 999px; background: rgba(255,255,255,.88); }
.wt-compass { position: absolute; right: 9px; bottom: 9px; }

.wt-sunband { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: end; gap: 12px; }
.wt-sunband-t { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.wt-sunband-t span { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 400; color: rgba(255,255,255,.75); margin-bottom: 1px; }
.wt-sunband-t:last-child { text-align: right; }
.wt-sunband-t:last-child span { justify-content: flex-end; }

.wt-foot { font-size: 11px; color: var(--dim); text-align: center; margin-top: 8px; }
.wt-foot a { color: inherit; text-decoration: underline; }
.wt-err { margin-bottom: 8px; }

.wt-glow {
  position: absolute; left: 12%; top: -180px; width: 520px; height: 520px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,232,160,.55) 0%, rgba(255,224,130,.18) 38%, transparent 68%);
  animation: wt-pulse 7s ease-in-out infinite;
}
.wt-moon {
  position: absolute; left: 27%; top: 44px; width: 46px; height: 46px; border-radius: 50%;
  background: radial-gradient(circle at 32% 30%, #f8fafc 0%, #cbd5e1 100%);
  box-shadow: 0 0 60px 14px rgba(203,213,225,.25);
}
.wt-star { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: #fff; animation: wt-twinkle 3s ease-in-out infinite; }
.wt-cloud {
  position: absolute; left: 0; border-radius: 50%; background: rgba(255,255,255,.16);
  filter: blur(34px); animation: wt-drift linear infinite;
}
.wt-cloud-1 { width: 420px; height: 150px; top: 2%; animation-duration: 70s; animation-delay: -12s; }
.wt-cloud-2 { width: 560px; height: 190px; top: 40%; animation-duration: 95s; animation-delay: -55s; background: rgba(255,255,255,.1); }
.wt-cloud-3 { width: 380px; height: 140px; top: 74%; animation-duration: 80s; animation-delay: -34s; }
.wt-drop {
  position: absolute; top: -24px; width: 1.5px; height: 18px;
  background: linear-gradient(to bottom, transparent, rgba(191,219,254,.6));
  animation: wt-fall linear infinite;
}
.wt-flake { position: absolute; top: -10px; width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,.8); animation: wt-snow linear infinite; }
.wt-bolt { position: absolute; inset: 0; animation: wt-flash 7s ease-in-out infinite; }
.wt-fog {
  position: absolute; left: -30%; right: -30%; height: 130px; filter: blur(26px);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.24), transparent);
  animation: wt-fog-move 30s ease-in-out infinite alternate;
}
.wt-fog-1 { top: 8%; }
.wt-fog-2 { top: 44%; animation-direction: alternate-reverse; }
.wt-fog-3 { top: 76%; animation-duration: 42s; }
@keyframes wt-rotate { to { transform: rotate(360deg); } }
@keyframes wt-pulse { 50% { transform: scale(1.06); opacity: .85; } }
@keyframes wt-twinkle { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes wt-drift { from { transform: translateX(-600px); } to { transform: translateX(calc(100vw + 100px)); } }
@keyframes wt-fall { to { transform: translateY(820px); } }
@keyframes wt-snow { to { transform: translate(40px, 820px); opacity: .3; } }
@keyframes wt-flash {
  0%, 92%, 95%, 100% { background: rgba(255,255,255,0); }
  93%, 94% { background: rgba(255,255,255,.35); }
  96%, 97% { background: rgba(255,255,255,.2); }
}
@keyframes wt-fog-move { from { transform: translateX(-16%); } to { transform: translateX(16%); } }
@media (prefers-reduced-motion: reduce) {
  .wt-layer *, .wt-spin svg { animation: none !important; }
}
`;

const DEFAULT_CITY: GeoResult = {
  id: 1566083,
  name: "Ho Chi Minh City",
  country: "Vietnam",
  latitude: 10.8231,
  longitude: 106.6297,
};

async function geocode(q: string, lang: Lang): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocode HTTP ${res.status}`);
  const j = await res.json();
  return (j.results ?? []) as GeoResult[];
}

async function fetchForecast(loc: GeoResult): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day,cloud_cover,visibility,dew_point_2m,uv_index,precipitation",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset,uv_index_max",
    timezone: "auto",
    forecast_days: "7",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
  return (await res.json()) as Forecast;
}

/** Never rejects: a missing observation just means the model value is shown. */
async function fetchObservation(loc: GeoResult): Promise<Observation | null> {
  try {
    const res = await fetch(`/api/weather?lat=${loc.latitude.toFixed(3)}&lon=${loc.longitude.toFixed(3)}`);
    if (!res.ok) return null;
    return ((await res.json()) as { observation: Observation | null }).observation;
  } catch {
    return null;
  }
}

// Open-Meteo times are wall-clock strings for the searched city, so they are
// read as text. `new Date()` would reinterpret them in the viewer's timezone.
const hhmm = (iso: string) => iso.slice(11, 16);

function fmtDayName(day: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

function isDayAt(iso: string, daily: ForecastDaily) {
  const i = daily.time.indexOf(iso.slice(0, 10));
  if (i < 0) return true;
  return iso >= daily.sunrise[i] && iso <= daily.sunset[i];
}

function minutesOf(iso: string) {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

const uvLevel = (uv: number) => (uv < 3 ? 0 : uv < 6 ? 1 : uv < 8 ? 2 : uv < 11 ? 3 : 4);
const clampPct = (v: number) => Math.max(0, Math.min(100, v));

function Meter({ pct }: { pct: number }) {
  return (
    <div className="wt-meter">
      <span style={{ width: `${clampPct(pct)}%` }} />
    </div>
  );
}

function Compass({ deg }: { deg: number }) {
  return (
    <svg className="wt-compass" width="38" height="38" viewBox="0 0 38 38" aria-hidden>
      <circle cx="19" cy="19" r="17" fill="none" stroke="rgba(255,255,255,.22)" />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1="19" y1="3" x2="19" y2="6.5" stroke="rgba(255,255,255,.55)" transform={`rotate(${a} 19 19)`} />
      ))}
      {/* METAR and Open-Meteo give the direction the wind comes from; the arrow shows where it blows. */}
      <g transform={`rotate(${deg + 180} 19 19)`}>
        <line x1="19" y1="28" x2="19" y2="11" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 8 L23.5 14 L14.5 14 Z" fill="#fff" />
      </g>
    </svg>
  );
}

function Metric({ icon, label, value, unit, sub, children }: {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="wt-glass wt-metric">
      <div className="wt-metric-lbl">{icon}{label}</div>
      <div className="wt-metric-val">{value}{unit && <small>{unit}</small>}</div>
      {sub && <div className="wt-metric-sub">{sub}</div>}
      {children}
    </div>
  );
}

type HourRow = { iso: string; temp: number; code: number; rain: number; isDay: boolean };

function pickLabels(rows: HourRow[]) {
  const temps = rows.map((r) => r.temp);
  const chosen = new Set([0, temps.indexOf(Math.max(...temps)), temps.indexOf(Math.min(...temps))]);
  rows.forEach((_, i) => {
    if (i % 3 === 0 && ![...chosen].some((c) => Math.abs(c - i) < 2)) chosen.add(i);
  });
  return chosen;
}

/** Catmull-Rom spline through the points, written as cubic Bézier segments. */
function smoothPath(pts: [number, number][]) {
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function HourlyChart({ rows, nowLabel, rainLabel, title }: {
  rows: HourRow[];
  nowLabel: string;
  rainLabel: string;
  title: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = rows.length;
  const temps = rows.map((r) => r.temp);
  const lo = Math.min(...temps);
  const span = Math.max(1, Math.max(...temps) - lo);
  const x = (i: number) => ((i + 0.5) / n) * 100;
  const y = (temp: number) => 84 - ((temp - lo) / span) * 54;
  const line = smoothPath(rows.map((r, i) => [x(i), y(r.temp)]));
  const labels = pickLabels(rows);
  const columns = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };
  const active = hover ?? 0;
  const peak = Math.max(...rows.map((r) => r.rain));

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - box.left) / box.width) * n))));
  };

  return (
    <div className="wt-glass wt-panel">
      <h3 className="wt-head">
        <IconClock size={13} stroke={2} />
        {title}
        <span className="wt-head-read">
          {active === 0 ? nowLabel : hhmm(rows[active].iso)} · {Math.round(rows[active].temp)}° · {rows[active].rain}%
        </span>
      </h3>
      <div className="wt-h-scroll">
        <div
          className="wt-h-inner"
          style={{ minWidth: n * 34 }}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <div className="wt-h-active" style={{ left: `${(active / n) * 100}%`, width: `${100 / n}%` }} />
          <div className="wt-h-row" style={columns}>
            {rows.map((r, i) => (
              <div key={r.iso} className={`wt-h-time${i === 0 ? " wt-h-time--now" : ""}`}>
                {i === 0 ? nowLabel : `${r.iso.slice(11, 13)}h`}
              </div>
            ))}
          </div>
          <div className="wt-h-row" style={columns}>
            {rows.map((r) => {
              const Icon = describe(r.code, r.isDay).icon;
              return (
                <div key={r.iso} className="wt-h-icon">
                  <Icon size={17} stroke={1.8} style={{ color: iconColor(r.code, r.isDay) }} />
                </div>
              );
            })}
          </div>
          <div className="wt-h-plot">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="wt-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity=".3" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${line}L${x(n - 1)} 100L${x(0)} 100Z`} fill="url(#wt-area)" />
              <path d={line} fill="none" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
            </svg>
            {[...labels].map((i) => (
              <span key={i} className="wt-h-label" style={{ left: `${x(i)}%`, top: `${y(rows[i].temp)}%` }}>
                {Math.round(rows[i].temp)}°
              </span>
            ))}
            <span className="wt-h-dot" style={{ left: `${x(active)}%`, top: `${y(rows[active].temp)}%` }} />
          </div>
          <div className="wt-h-row wt-h-bars" style={columns}>
            {rows.map((r) => (
              <div key={r.iso} className="wt-h-bar" style={{ height: `${Math.max(r.rain > 0 ? 8 : 0, r.rain)}%` }} />
            ))}
          </div>
        </div>
      </div>
      <div className="wt-h-rainlbl">
        <IconDroplets size={12} stroke={2} />
        {rainLabel} · {peak}%
      </div>
    </div>
  );
}

function SunArc({ now, sunrise, sunset }: { now: string; sunrise: string; sunset: string }) {
  const rise = minutesOf(sunrise);
  const progress = Math.max(0, Math.min(1, (minutesOf(now) - rise) / Math.max(1, minutesOf(sunset) - rise)));
  const point = (p: number) => `${(10 + p * 300).toFixed(1)},${(46 - Math.sin(p * Math.PI) * 38).toFixed(1)}`;
  const path = (to: number) => repeat(41).map((i) => point((i / 40) * to)).join(" ");
  const [cx, cy] = point(progress).split(",");
  return (
    <svg viewBox="0 0 320 52" width="100%" height="52" aria-hidden>
      <line x1="0" y1="46" x2="320" y2="46" stroke="rgba(255,255,255,.2)" />
      <polyline points={path(1)} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
      <polyline points={path(progress)} fill="none" stroke="var(--wt-sun)" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="11" fill="var(--wt-sun)" opacity=".25" />
      <circle cx={cx} cy={cy} r="5.5" fill="var(--wt-sun)" />
    </svg>
  );
}

export default function WeatherTool() {
  const { t, lang } = useI18n();
  const [loc, setLoc] = useState<GeoResult>(DEFAULT_CITY);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [suggests, setSuggests] = useState<GeoResult[]>([]);
  const latestLoad = useRef(0);

  const load = useCallback(async (target: GeoResult) => {
    const id = ++latestLoad.current;
    setLoading(true);
    setErr(null);
    try {
      const [forecast, observation] = await Promise.all([fetchForecast(target), fetchObservation(target)]);
      if (id !== latestLoad.current) return;
      const merged = observation ? applyObservation(forecast, observation) : null;
      setLoaded({ forecast: merged ?? forecast, observation: merged ? observation : null });
    } catch (e) {
      if (id === latestLoad.current) setErr(e instanceof Error ? e.message : "unknown");
    } finally {
      if (id === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(loc);
  }, [loc, load]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggests([]);
      return;
    }
    let stale = false;
    const id = setTimeout(async () => {
      const found = await geocode(q, lang).catch(() => []);
      if (!stale) setSuggests(found);
    }, 300);
    return () => {
      stale = true;
      clearTimeout(id);
    };
  }, [query, lang]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setErr(t("wt_err_geo"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLoc({
          id: 0,
          name: t("wt_my_loc_name"),
          country: "",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (e) => setErr(e.message),
      { timeout: 10000 },
    );
  };

  const data = loaded?.forecast;
  const observation = loaded?.observation ?? null;
  const current = data?.current;

  const hours = useMemo<HourRow[]>(() => {
    if (!data) return [];
    const start = data.hourly.time.findIndex((h) => h.slice(0, 13) === data.current.time.slice(0, 13));
    if (start < 0) return [];
    return data.hourly.time.slice(start, start + 24).map((iso, k) => {
      const i = start + k;
      return {
        iso,
        temp: data.hourly.temperature_2m[i],
        // The first column is "now", so it must agree with the hero.
        code: k === 0 ? data.current.weather_code : data.hourly.weather_code[i],
        rain: data.hourly.precipitation_probability[i] ?? 0,
        isDay: isDayAt(iso, data.daily),
      };
    });
  }, [data]);

  const ageLabel = (() => {
    if (!observation) return "";
    const mins = Math.max(0, Math.round((Date.now() - observation.observedAt) / 60000));
    return mins < 1 ? t("wt_just_now") : t("wt_min_ago").replace("{n}", String(mins));
  })();

  const isDay = current ? !!current.is_day : false;
  const desc = current ? describe(current.weather_code, isDay) : null;
  const scene: Scene = desc?.scene ?? "cloud";

  const background = (() => {
    if (current && data && scene === "clear") {
      const now = minutesOf(current.time);
      const golden = [data.daily.sunrise[0], data.daily.sunset[0]].some(
        (edge) => Math.abs(now - minutesOf(edge)) <= GOLDEN_MINUTES,
      );
      if (golden) return GOLDEN_SKY;
    }
    return SKY[scene][isDay ? 0 : 1];
  })();

  const windDir = (deg: number) => t(`wt_dir_${Math.round(deg / 45) % 8}` as never);
  const uv = current ? current.uv_index ?? data?.daily.uv_index_max[0] ?? 0 : 0;
  const feelsDiff = current ? current.apparent_temperature - current.temperature_2m : 0;
  const daylightMins = data ? minutesOf(data.daily.sunset[0]) - minutesOf(data.daily.sunrise[0]) : 0;

  return (
    <div className="fp-tool">
      <style>{CSS}</style>
      {err && (
        <div className="wt-err">
          <Alert tone="danger" title={t("wt_err_title")}>
            {err}
          </Alert>
        </div>
      )}
      <div className="wt-sky" style={{ background }}>
        <SkyLayer scene={scene} isDay={isDay} cloudy={current?.weather_code === 2} />

        <div className="wt-bar">
          <div className="wt-search">
            <Input
              inputSize="md"
              type="search"
              placeholder={t("wt_search_ph")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<IconSearch size={15} stroke={1.8} />}
            />
            {suggests.length > 0 && (
              <div className="wt-suggest">
                {suggests.map((s) => (
                  <Button
                    key={`${s.id}-${s.latitude}`}
                    variant="ghost"
                    size="sm"
                    block
                    onClick={() => {
                      setLoc(s);
                      setQuery("");
                      setSuggests([]);
                    }}
                  >
                    {s.name}
                    <span className="wt-suggest-sub">{[s.admin1, s.country].filter(Boolean).join(", ")}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
          <IconButton
            variant="subtle"
            size="md"
            round
            aria-label={t("wt_my_loc")}
            title={t("wt_my_loc")}
            onClick={useMyLocation}
          >
            <IconCurrentLocation size={16} stroke={1.8} />
          </IconButton>
          <IconButton
            variant="subtle"
            size="md"
            round
            aria-label={t("wt_refresh")}
            title={t("wt_refresh")}
            className={loading ? "wt-spin" : undefined}
            disabled={loading}
            onClick={() => load(loc)}
          >
            <IconRefresh size={16} stroke={1.8} />
          </IconButton>
        </div>

        {loading && !data && (
          <div className="wt-grid">
            <Skeleton width="100%" height={460} radius={14} />
            <Skeleton width="100%" height={460} radius={14} />
          </div>
        )}

        {current && data && desc && (
          <div className="wt-grid">
            <div className="wt-col">
              <div className="wt-hero">
                <div className="wt-place">
                  <IconMapPin size={16} stroke={2} />
                  <b title={[loc.name, loc.country].filter(Boolean).join(", ")}>{loc.name}</b>
                  <span className="wt-clock">
                    {current.time.slice(8, 10)}/{current.time.slice(5, 7)} · {hhmm(current.time)}
                  </span>
                </div>
                <div className="wt-temp">{Math.round(current.temperature_2m)}°</div>
                <div className="wt-cond">{t(desc.key as never)}</div>
                <div className="wt-range">
                  <span>
                    <IconArrowUp size={13} stroke={2} aria-label={t("wt_hi")} />
                    {Math.round(data.daily.temperature_2m_max[0])}°
                  </span>
                  <span>
                    <IconArrowDown size={13} stroke={2} aria-label={t("wt_lo")} />
                    {Math.round(data.daily.temperature_2m_min[0])}°
                  </span>
                  <span>
                    {t("wt_feels_full")} {Math.round(current.apparent_temperature)}°
                  </span>
                </div>
                <div className="wt-source" title={observation ? observation.stationName : t("wt_src_model_hint")}>
                  <IconRadar2 size={12} stroke={2} />
                  {observation
                    ? `${t("wt_src_station")} · ${observation.stationId} · ${observation.distanceKm} km · ${ageLabel}`
                    : t("wt_src_model")}
                </div>
              </div>

              <div className="wt-glass wt-panel">
                <h3 className="wt-head">
                  <IconCalendar size={13} stroke={2} />
                  {t("wt_forecast7")}
                </h3>
                {(() => {
                  const weekMin = Math.min(...data.daily.temperature_2m_min);
                  const span = Math.max(1, Math.max(...data.daily.temperature_2m_max) - weekMin);
                  const pct = (v: number) => clampPct(((v - weekMin) / span) * 100);
                  return data.daily.time.map((day, i) => {
                    const code = data.daily.weather_code[i];
                    const DayIcon = describe(code).icon;
                    const lo = data.daily.temperature_2m_min[i];
                    const hi = data.daily.temperature_2m_max[i];
                    const rain = data.daily.precipitation_probability_max[i] ?? 0;
                    return (
                      <div key={day} className={`wt-day${i === 0 ? " wt-day--today" : ""}`}>
                        <span className="wt-day-name">{i === 0 ? t("wt_today") : fmtDayName(day, lang)}</span>
                        <DayIcon size={17} stroke={1.8} style={{ color: iconColor(code, true) }} />
                        <span className="wt-day-rain">
                          {rain >= 15 && (
                            <>
                              <IconDroplets size={10} stroke={2} />
                              {rain}%
                            </>
                          )}
                        </span>
                        <span className="wt-day-lo">{Math.round(lo)}°</span>
                        <div className="wt-track">
                          <div className="wt-fill" style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
                          {i === 0 && <div className="wt-pin" style={{ left: `${pct(current.temperature_2m)}%` }} />}
                        </div>
                        <span className="wt-day-hi">{Math.round(hi)}°</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="wt-col">
              {hours.length > 0 && (
                <HourlyChart
                  rows={hours}
                  nowLabel={t("wt_now")}
                  rainLabel={t("wt_rain_chance")}
                  title={t("wt_next24")}
                />
              )}

              <div className="wt-metrics">
                <Metric
                  icon={<IconTemperature size={13} />}
                  label={t("wt_feels_full")}
                  value={`${Math.round(current.apparent_temperature)}°`}
                  sub={t(feelsDiff > 1 ? "wt_feels_warmer" : feelsDiff < -1 ? "wt_feels_cooler" : "wt_feels_same")}
                />
                <Metric
                  icon={<IconWind size={13} />}
                  label={t("wt_wind")}
                  value={current.wind_speed_10m.toFixed(0)}
                  unit="km/h"
                  sub={windDir(current.wind_direction_10m)}
                >
                  <Compass deg={current.wind_direction_10m} />
                </Metric>
                <Metric
                  icon={<IconDroplet size={13} />}
                  label={t("wt_humidity")}
                  value={`${current.relative_humidity_2m}%`}
                  sub={current.dew_point_2m != null ? `${t("wt_dew")} ${Math.round(current.dew_point_2m)}°` : undefined}
                />
                <Metric
                  icon={<IconSun size={13} />}
                  label={t("wt_uv")}
                  value={String(Math.round(uv))}
                  unit={t(`wt_uv_${uvLevel(uv)}` as never)}
                >
                  <Meter pct={(uv / 11) * 100} />
                </Metric>
                <Metric
                  icon={<IconEye size={13} />}
                  label={t("wt_visibility")}
                  value={
                    current.visibility == null
                      ? "—"
                      : current.visibility >= 10000
                        ? "10+"
                        : (current.visibility / 1000).toFixed(0)
                  }
                  unit={current.visibility == null ? undefined : "km"}
                >
                  {current.visibility != null && <Meter pct={current.visibility / 100} />}
                </Metric>
                <Metric
                  icon={<IconGauge size={13} />}
                  label={t("wt_pressure")}
                  value={String(Math.round(current.surface_pressure))}
                  unit="hPa"
                />
                <Metric icon={<IconCloud size={13} />} label={t("wt_cloud")} value={`${current.cloud_cover ?? 0}%`}>
                  <Meter pct={current.cloud_cover ?? 0} />
                </Metric>
                <Metric
                  icon={<IconUmbrella size={13} />}
                  label={t("wt_precip")}
                  value={(current.precipitation ?? 0).toFixed(1)}
                  unit="mm"
                />
              </div>

              <div className="wt-glass wt-panel wt-sunband">
                <div className="wt-sunband-t">
                  <span><IconSunrise size={13} stroke={2} />{t("wt_sunrise")}</span>
                  {hhmm(data.daily.sunrise[0])}
                </div>
                <div title={`${t("wt_daylight")} ${t("wt_daylight_fmt")
                  .replace("{h}", String(Math.floor(daylightMins / 60)))
                  .replace("{m}", String(daylightMins % 60))}`}>
                  <SunArc now={current.time} sunrise={data.daily.sunrise[0]} sunset={data.daily.sunset[0]} />
                </div>
                <div className="wt-sunband-t">
                  <span>{t("wt_sunset")}<IconSunset size={13} stroke={2} /></span>
                  {hhmm(data.daily.sunset[0])}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="wt-foot">
        {t("wt_source")}{" "}
        <a href="https://aviationweather.gov/" target="_blank" rel="noreferrer">NOAA AWC</a>
        {" · "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
      </div>
    </div>
  );
}
