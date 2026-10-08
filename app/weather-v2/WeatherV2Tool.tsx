"use client";
import { Alert, Button, Card, Skeleton } from "@/components/ui";
import {
  IconCloud,
  IconCloudRain,
  IconCloudSnow,
  IconCloudStorm,
  IconDroplet,
  IconMapPin,
  IconMist,
  IconRefresh,
  IconSearch,
  IconSun,
  IconWind,
  IconGauge,
  IconTemperature,
  IconCurrentLocation,
  IconEye,
  IconUmbrella,
  IconClock,
  IconCalendar,
  IconDroplets,
  IconSunHigh,
  IconSunset,
  IconLeaf,
  IconMoon,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

type GeoResult = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

type CurrentWeather = {
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_gusts_10m?: number;
  wind_direction_10m: number;
  surface_pressure: number;
  is_day: number;
  time: string;
  cloud_cover?: number;
  visibility?: number;
  dew_point_2m?: number;
  uv_index?: number;
  precipitation?: number;
};

type Daily = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  precipitation_probability_max: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max: number[];
};

type Hourly = {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
  precipitation_probability: number[];
  precipitation: number[];
};

type WeatherData = {
  current: CurrentWeather;
  daily: Daily;
  hourly: Hourly;
  timezone: string;
};

type AirQuality = {
  current: {
    time: string;
    european_aqi?: number;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
    nitrogen_dioxide?: number;
  };
};

type ModelKey = "best_match" | "ecmwf_ifs025" | "gfs_seamless" | "icon_seamless";

const MODELS: { key: ModelKey; label: string; sub: { vi: string; en: string } }[] = [
  { key: "ecmwf_ifs025", label: "ECMWF", sub: { vi: "Chính xác nhất cho VN", en: "Best for Vietnam" } },
  { key: "best_match", label: "Auto", sub: { vi: "Tự chọn mô hình tốt nhất", en: "Auto-pick best model" } },
  { key: "gfs_seamless", label: "GFS", sub: { vi: "Mô hình Mỹ (NOAA)", en: "NOAA (USA) model" } },
  { key: "icon_seamless", label: "ICON", sub: { vi: "Mô hình Đức (DWD)", en: "DWD (Germany) model" } },
];

const WMO: Record<number, { key: string; icon: typeof IconSun }> = {
  0: { key: "wt_w_clear", icon: IconSun },
  1: { key: "wt_w_mclear", icon: IconSun },
  2: { key: "wt_w_pcloud", icon: IconCloud },
  3: { key: "wt_w_cloud", icon: IconCloud },
  45: { key: "wt_w_fog", icon: IconMist },
  48: { key: "wt_w_rfog", icon: IconMist },
  51: { key: "wt_w_drizl", icon: IconCloudRain },
  53: { key: "wt_w_drizm", icon: IconCloudRain },
  55: { key: "wt_w_drizh", icon: IconCloudRain },
  61: { key: "wt_w_rainl", icon: IconCloudRain },
  63: { key: "wt_w_rainm", icon: IconCloudRain },
  65: { key: "wt_w_rainh", icon: IconCloudRain },
  71: { key: "wt_w_snowl", icon: IconCloudSnow },
  73: { key: "wt_w_snowm", icon: IconCloudSnow },
  75: { key: "wt_w_snowh", icon: IconCloudSnow },
  80: { key: "wt_w_showl", icon: IconCloudRain },
  81: { key: "wt_w_showm", icon: IconCloudRain },
  82: { key: "wt_w_showh", icon: IconCloudRain },
  95: { key: "wt_w_storm", icon: IconCloudStorm },
  96: { key: "wt_w_stormh1", icon: IconCloudStorm },
  99: { key: "wt_w_stormh2", icon: IconCloudStorm },
};

function describe(code: number) {
  return WMO[code] ?? { key: "wt_w_unknown", icon: IconCloud };
}

type Scene = "clear" | "cloud" | "rain" | "snow" | "storm" | "fog";

function sceneOf(code: number, isDay: number): Scene {
  if ([95, 96, 99].includes(code)) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([45, 48].includes(code)) return "fog";
  if ([2, 3].includes(code)) return "cloud";
  return isDay ? "clear" : "cloud";
}

function skyGradient(scene: Scene, hour: number, isDay: boolean): string {
  if (scene === "clear" && isDay) {
    if (hour < 7) return "linear-gradient(170deg, #fb923c 0%, #fcd34d 40%, #60a5fa 100%)";
    if (hour >= 17) return "linear-gradient(170deg, #ea580c 0%, #c026d3 55%, #312e81 100%)";
    return "linear-gradient(170deg, #0ea5e9 0%, #38bdf8 45%, #93c5fd 100%)";
  }
  if (scene === "clear" && !isDay)
    return "linear-gradient(170deg, #0b1026 0%, #1e1b4b 55%, #4c1d95 100%)";
  if (scene === "cloud")
    return isDay
      ? "linear-gradient(170deg, #64748b 0%, #94a3b8 55%, #cbd5e1 100%)"
      : "linear-gradient(170deg, #1e293b 0%, #334155 55%, #475569 100%)";
  if (scene === "rain")
    return "linear-gradient(170deg, #1e293b 0%, #334155 50%, #475569 100%)";
  if (scene === "storm")
    return "linear-gradient(170deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)";
  if (scene === "snow")
    return "linear-gradient(170deg, #93c5fd 0%, #dbeafe 55%, #f1f5f9 100%)";
  return "linear-gradient(170deg, #64748b 0%, #94a3b8 100%)";
}

function WeatherAnim({ scene, isDay, hour }: { scene: Scene; isDay: boolean; hour: number }) {
  return (
    <div className="wv-anim" style={{ background: skyGradient(scene, hour, isDay) }} aria-hidden>
      {scene === "clear" && isDay && (
        <>
          <div className="wv-sun" />
          <div className="wv-sun-glow" />
        </>
      )}
      {scene === "clear" && !isDay && (
        <>
          <div className="wv-moon" />
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className="wv-star"
              style={{
                left: `${(i * 71) % 100}%`,
                top: `${(i * 29) % 85}%`,
                animationDelay: `${(i % 7) * 0.3}s`,
              }}
            />
          ))}
        </>
      )}
      {(scene === "cloud" || scene === "rain" || scene === "storm" || scene === "fog") && (
        <>
          <div className="wv-cloud wv-cloud-1" />
          <div className="wv-cloud wv-cloud-2" />
          <div className="wv-cloud wv-cloud-3" />
          <div className="wv-cloud wv-cloud-4" />
        </>
      )}
      {scene === "rain" &&
        Array.from({ length: 55 }).map((_, i) => (
          <div
            key={i}
            className="wv-drop"
            style={{
              left: `${(i * 1.9) % 100}%`,
              animationDelay: `${(i % 10) * 0.1}s`,
              animationDuration: `${0.55 + ((i * 13) % 40) / 100}s`,
            }}
          />
        ))}
      {scene === "storm" && (
        <>
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="wv-drop"
              style={{
                left: `${(i * 1.8) % 100}%`,
                animationDelay: `${(i % 10) * 0.09}s`,
                animationDuration: `${0.45 + ((i * 11) % 40) / 100}s`,
              }}
            />
          ))}
          <div className="wv-bolt" />
        </>
      )}
      {scene === "snow" &&
        Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="wv-flake"
            style={{
              left: `${(i * 2.6) % 100}%`,
              animationDelay: `${(i % 8) * 0.4}s`,
              animationDuration: `${4 + ((i * 7) % 40) / 10}s`,
            }}
          >
            •
          </div>
        ))}
      {scene === "fog" && (
        <>
          <div className="wv-fog wv-fog-1" />
          <div className="wv-fog wv-fog-2" />
          <div className="wv-fog wv-fog-3" />
        </>
      )}
    </div>
  );
}

const CSS = `
.wv-root { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif; }

.wv-anim { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; z-index: 0; pointer-events: none; }
.wv-anim::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.25) 100%);
}

.wv-hero {
  position: relative; overflow: hidden; color: #fff;
  border: none !important; border-radius: 24px !important;
  min-height: 420px;
  box-shadow: 0 20px 60px -20px rgba(15,23,42,.4);
}
.wv-hero > *:not(.wv-anim) { position: relative; z-index: 1; }
.wv-hero * { color: #fff; }

.wv-hero-top {
  display: flex; align-items: center; gap: 10px;
  padding: 18px 20px 0;
  font-size: 13px;
}
.wv-live-dot {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px;
  background: rgba(255,255,255,.18);
  backdrop-filter: blur(10px);
  font-size: 11px; font-weight: 600; letter-spacing: .04em;
}
.wv-live-dot i {
  width: 6px; height: 6px; border-radius: 50%;
  background: #22c55e; box-shadow: 0 0 8px #22c55e;
}

.wv-hero-main {
  text-align: center; padding: 10px 0 30px;
}
.wv-city { font-size: 32px; font-weight: 400; letter-spacing: -0.01em; margin-top: 4px; }
.wv-temp {
  font-size: 110px; font-weight: 100; line-height: 1;
  letter-spacing: -0.05em; margin: 10px 0 2px;
  font-variant-numeric: tabular-nums;
}
.wv-cond { font-size: 20px; font-weight: 400; opacity: .95; }
.wv-hilo { font-size: 16px; opacity: .9; margin-top: 4px; font-variant-numeric: tabular-nums; }

.wv-model-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px;
  background: rgba(0,0,0,.2);
  backdrop-filter: blur(10px);
  font-size: 10.5px; font-weight: 600; letter-spacing: .04em;
  margin-left: auto;
}

/* iOS-style blur card */
.wv-blur {
  background: var(--surface, #fff);
  border: 1px solid var(--line, rgba(0,0,0,.06));
  border-radius: 18px;
  padding: 14px 16px;
  margin-top: 10px;
}
:root.dark .wv-blur, [data-theme="dark"] .wv-blur {
  background: rgba(28,28,30,.72);
  border-color: rgba(255,255,255,.08);
}

.wv-sec-head {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
  opacity: .5; margin: 0 0 10px; padding-bottom: 10px;
  border-bottom: 1px solid var(--line, rgba(0,0,0,.06));
}

/* Narrative strip */
.wv-narrative {
  padding: 2px 0 10px;
  font-size: 14px; line-height: 1.5;
  border-bottom: 1px solid var(--line, rgba(0,0,0,.05));
  margin-bottom: 10px;
}

/* Hourly line chart */
.wv-hourly-wrap { position: relative; }
.wv-hourly-chart {
  position: relative; width: 100%; height: 150px;
  overflow-x: auto; overflow-y: hidden;
  padding-bottom: 20px;
}
.wv-hourly-svg { display: block; }

/* Daily list */
.wv-day-list { display: flex; flex-direction: column; }
.wv-day {
  display: grid;
  grid-template-columns: 60px 28px 44px 1fr auto;
  align-items: center; gap: 10px;
  padding: 10px 2px;
  border-bottom: 1px solid var(--line, rgba(0,0,0,.05));
  font-size: 15px;
}
.wv-day:last-child { border-bottom: none; }
.wv-day-name { font-weight: 500; letter-spacing: -0.01em; }
.wv-day-rain {
  display: inline-flex; align-items: center; gap: 2px;
  font-size: 11px; color: #38bdf8; font-weight: 600;
  min-height: 14px;
}
.wv-day-bar-wrap {
  display: flex; align-items: center; gap: 10px;
  font-variant-numeric: tabular-nums; font-size: 14px;
}
.wv-day-lo { opacity: .5; min-width: 28px; text-align: right; }
.wv-day-hi { font-weight: 500; min-width: 28px; }
.wv-day-bar {
  position: relative; flex: 1; min-width: 70px; height: 6px;
  background: var(--line, rgba(120,120,128,.16)); border-radius: 999px;
  overflow: hidden;
}
.wv-day-bar-fill {
  position: absolute; top: 0; bottom: 0; border-radius: 999px;
  background: linear-gradient(90deg, #60a5fa 0%, #34d399 40%, #fbbf24 70%, #fb7185 100%);
}
.wv-day-bar-now {
  position: absolute; top: 50%; width: 9px; height: 9px;
  background: #fff; border: 2px solid #0f172a;
  border-radius: 50%; transform: translate(-50%, -50%);
  box-shadow: 0 0 0 2px rgba(255,255,255,.4);
}

/* Detail grid */
.wv-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 10px;
}
.wv-dcard {
  padding: 12px 14px;
  background: var(--surface-2, rgba(120,120,128,.08));
  border-radius: 14px;
  min-height: 100px;
  display: flex; flex-direction: column;
}
.wv-dcard-head {
  display: flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 600; letter-spacing: .06em;
  text-transform: uppercase; opacity: .55;
}
.wv-dcard-val {
  font-size: 26px; font-weight: 300; letter-spacing: -0.02em;
  line-height: 1.1; margin-top: 6px;
  font-variant-numeric: tabular-nums;
}
.wv-dcard-sub {
  font-size: 12px; opacity: .65; margin-top: auto; padding-top: 4px;
}
.wv-dcard-bar {
  height: 4px; margin-top: 8px; border-radius: 999px;
  background: var(--line, rgba(120,120,128,.15));
  overflow: hidden; position: relative;
}
.wv-dcard-bar-fill {
  position: absolute; top: 0; bottom: 0; left: 0;
  border-radius: 999px;
}

/* Sun arc */
.wv-sun-wrap { position: relative; height: 90px; margin: 6px 2px 0; }
.wv-sun-times {
  display: flex; justify-content: space-between; margin-top: 6px;
  font-size: 12px; font-variant-numeric: tabular-nums;
}
.wv-sun-times b { font-weight: 500; display: block; }
.wv-sun-times span { font-size: 10px; opacity: .55; letter-spacing: .04em; text-transform: uppercase; }

/* Model switcher */
.wv-models {
  display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;
}
.wv-model-btn {
  padding: 6px 12px; border-radius: 999px;
  border: 1px solid var(--line, rgba(0,0,0,.1));
  background: transparent; color: inherit;
  font-size: 12px; font-weight: 500; cursor: pointer;
  transition: all .15s;
}
.wv-model-btn:hover { background: var(--surface-2, rgba(0,0,0,.04)); }
.wv-model-btn.active {
  background: var(--text, #0f172a); color: var(--bg, #fff);
  border-color: var(--text, #0f172a);
}
:root.dark .wv-model-btn.active, [data-theme="dark"] .wv-model-btn.active {
  background: #fff; color: #0f172a; border-color: #fff;
}

/* Scene elements */
.wv-sun {
  position: absolute; right: 10%; top: 15%;
  width: 110px; height: 110px; border-radius: 50%;
  background: radial-gradient(circle, #fffbeb 0%, #fde047 50%, #f59e0b 100%);
  box-shadow: 0 0 80px rgba(253,224,71,.9);
  animation: wv-pulse 4s ease-in-out infinite;
}
.wv-sun-glow {
  position: absolute; right: calc(10% - 40px); top: calc(15% - 40px);
  width: 190px; height: 190px;
  background: radial-gradient(circle, rgba(253,224,71,.45) 0%, transparent 65%);
  animation: wv-pulse 4s ease-in-out infinite;
}
.wv-moon {
  position: absolute; right: 10%; top: 15%;
  width: 70px; height: 70px; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #f8fafc 0%, #cbd5e1 100%);
  box-shadow: 0 0 50px rgba(203,213,225,.6);
}
.wv-star {
  position: absolute; width: 2px; height: 2px;
  background: #fff; border-radius: 50%;
  animation: wv-twinkle 2.5s ease-in-out infinite;
  box-shadow: 0 0 3px rgba(255,255,255,.7);
}
.wv-cloud {
  position: absolute; height: 45px; border-radius: 45px;
  background: rgba(255,255,255,.4); filter: blur(2px);
  animation: wv-drift linear infinite;
}
.wv-cloud::before, .wv-cloud::after {
  content: ""; position: absolute; background: inherit; border-radius: 50%;
}
.wv-cloud::before { width: 45px; height: 45px; top: -20px; left: 18px; }
.wv-cloud::after { width: 32px; height: 32px; top: -14px; left: 50px; }
.wv-cloud-1 { width: 100px; top: 20%; animation-duration: 42s; }
.wv-cloud-2 { width: 130px; top: 45%; animation-duration: 55s; animation-delay: -22s; background: rgba(255,255,255,.3); }
.wv-cloud-3 { width: 75px; top: 70%; animation-duration: 38s; animation-delay: -12s; background: rgba(255,255,255,.45); }
.wv-cloud-4 { width: 90px; top: 10%; animation-duration: 50s; animation-delay: -30s; background: rgba(255,255,255,.25); }
.wv-drop {
  position: absolute; top: -20px;
  width: 2px; height: 16px;
  background: linear-gradient(to bottom, transparent, rgba(219,234,254,.95));
  animation: wv-fall linear infinite;
}
.wv-flake {
  position: absolute; top: -20px; color: #fff; font-size: 14px;
  animation: wv-snowfall linear infinite;
  text-shadow: 0 0 4px rgba(255,255,255,.6);
}
.wv-bolt {
  position: absolute; inset: 0; background: rgba(255,255,255,0);
  animation: wv-flash 4.5s ease-in-out infinite;
}
.wv-fog {
  position: absolute; left: -20%; right: -20%; height: 90px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent);
  filter: blur(10px); animation: wv-fog-move linear infinite;
}
.wv-fog-1 { top: 25%; animation-duration: 22s; }
.wv-fog-2 { top: 50%; animation-duration: 32s; animation-direction: reverse; }
.wv-fog-3 { top: 72%; animation-duration: 28s; }

@keyframes wv-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: .95; } }
@keyframes wv-twinkle { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes wv-drift {
  from { transform: translateX(-180px); }
  to { transform: translateX(calc(100vw + 180px)); }
}
@keyframes wv-fall {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(440px); opacity: .25; }
}
@keyframes wv-snowfall {
  from { transform: translateY(0) translateX(0); opacity: 1; }
  to { transform: translateY(440px) translateX(40px); opacity: .3; }
}
@keyframes wv-flash {
  0%, 92%, 100% { background: rgba(255,255,255,0); }
  93%, 94% { background: rgba(255,255,255,.75); }
  95% { background: rgba(255,255,255,0); }
  96%, 97% { background: rgba(255,255,255,.55); }
}
@keyframes wv-fog-move {
  from { transform: translateX(-30%); }
  to { transform: translateX(30%); }
}
@media (prefers-reduced-motion: reduce) {
  .wv-anim * { animation: none !important; }
}
`;

const DEFAULT_CITY: GeoResult = {
  id: 1566083,
  name: "Hồ Chí Minh",
  country: "Vietnam",
  latitude: 10.8231,
  longitude: 106.6297,
  timezone: "Asia/Ho_Chi_Minh",
};

async function geocode(q: string, lang: "vi" | "en" = "vi"): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocode HTTP ${res.status}`);
  const j = await res.json();
  return (j.results ?? []) as GeoResult[];
}

async function fetchWeather(loc: GeoResult, model: ModelKey): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure,is_day,cloud_cover,visibility,dew_point_2m,uv_index,precipitation",
    hourly: "temperature_2m,weather_code,precipitation_probability,precipitation",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset,uv_index_max",
    timezone: "auto",
    forecast_days: "10",
    models: model,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
  return (await res.json()) as WeatherData;
}

async function fetchAir(loc: GeoResult): Promise<AirQuality | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      current: "european_aqi,us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide",
      timezone: "auto",
    });
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
    if (!res.ok) return null;
    return (await res.json()) as AirQuality;
  } catch {
    return null;
  }
}

function fmtDayName(iso: string, lang: "vi" | "en") {
  const d = new Date(iso);
  const names = lang === "vi"
    ? ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names[d.getDay()];
}

function fmtHour(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function windDirText(deg: number, lang: "vi" | "en") {
  const dirsVi = ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"];
  const dirsEn = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const arr = lang === "vi" ? dirsVi : dirsEn;
  return arr[Math.round(deg / 45) % 8];
}

function uvLabel(uv: number, lang: "vi" | "en") {
  if (uv < 3) return lang === "vi" ? "Thấp" : "Low";
  if (uv < 6) return lang === "vi" ? "Trung bình" : "Moderate";
  if (uv < 8) return lang === "vi" ? "Cao" : "High";
  if (uv < 11) return lang === "vi" ? "Rất cao" : "Very high";
  return lang === "vi" ? "Nguy hiểm" : "Extreme";
}

function aqiInfo(aqi: number, lang: "vi" | "en") {
  if (aqi <= 20) return { label: lang === "vi" ? "Rất tốt" : "Very good", color: "#22c55e" };
  if (aqi <= 40) return { label: lang === "vi" ? "Tốt" : "Good", color: "#84cc16" };
  if (aqi <= 60) return { label: lang === "vi" ? "Trung bình" : "Moderate", color: "#eab308" };
  if (aqi <= 80) return { label: lang === "vi" ? "Kém" : "Poor", color: "#f97316" };
  if (aqi <= 100) return { label: lang === "vi" ? "Xấu" : "Bad", color: "#ef4444" };
  return { label: lang === "vi" ? "Nguy hại" : "Hazardous", color: "#a855f7" };
}

function narrativeText(w: WeatherData, lang: "vi" | "en"): string {
  const hourly = w.hourly;
  const now = Date.now();
  let nextRainIdx = -1;
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]).getTime();
    if (t < now) continue;
    if ((hourly.precipitation_probability[i] ?? 0) >= 50) {
      nextRainIdx = i;
      break;
    }
  }
  const todayMax = Math.round(w.daily.temperature_2m_max[0]);
  const todayMin = Math.round(w.daily.temperature_2m_min[0]);
  const tmrMax = Math.round(w.daily.temperature_2m_max[1] ?? todayMax);
  const diff = tmrMax - todayMax;

  const parts: string[] = [];
  if (nextRainIdx > 0 && nextRainIdx < 12) {
    const h = new Date(hourly.time[nextRainIdx]).getHours();
    const prob = hourly.precipitation_probability[nextRainIdx];
    parts.push(
      lang === "vi"
        ? `Khả năng mưa quanh ${h}:00 (${prob}%).`
        : `Rain likely around ${h}:00 (${prob}%).`,
    );
  } else {
    parts.push(
      lang === "vi"
        ? `Cao nhất hôm nay ${todayMax}°, thấp nhất ${todayMin}°.`
        : `Today's high ${todayMax}°, low ${todayMin}°.`,
    );
  }
  if (Math.abs(diff) >= 2) {
    parts.push(
      lang === "vi"
        ? `Ngày mai ${diff > 0 ? "ấm hơn" : "mát hơn"} khoảng ${Math.abs(diff)}°.`
        : `Tomorrow will be ${Math.abs(diff)}° ${diff > 0 ? "warmer" : "cooler"}.`,
    );
  }
  return parts.join(" ");
}

export default function WeatherV2Tool() {
  const { t, lang } = useI18n();
  const [loc, setLoc] = useState<GeoResult>(DEFAULT_CITY);
  const [data, setData] = useState<WeatherData | null>(null);
  const [air, setAir] = useState<AirQuality | null>(null);
  const [model, setModel] = useState<ModelKey>("ecmwf_ifs025");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [suggests, setSuggests] = useState<GeoResult[]>([]);

  const load = useCallback(
    async (target: GeoResult, m: ModelKey) => {
      setLoading(true);
      setErr(null);
      try {
        const [w, a] = await Promise.all([fetchWeather(target, m), fetchAir(target)]);
        setData(w);
        setAir(a);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "unknown");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(loc, model);
  }, [loc, model, load]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggests([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const r = await geocode(query.trim(), lang);
        setSuggests(r);
      } catch {
        setSuggests([]);
      }
    }, 300);
    return () => clearTimeout(id);
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

  const current = data?.current;
  const currentDesc = current ? describe(current.weather_code) : null;
  const scene = current ? sceneOf(current.weather_code, current.is_day) : "cloud";
  const nowHour = current ? new Date(current.time).getHours() : 12;
  const todayMax = data?.daily.temperature_2m_max?.[0];
  const todayMin = data?.daily.temperature_2m_min?.[0];

  const next24 = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const idxs: number[] = [];
    for (let i = 0; i < data.hourly.time.length; i++) {
      const t = new Date(data.hourly.time[i]).getTime();
      if (t >= now - 30 * 60 * 1000 && idxs.length < 24) idxs.push(i);
    }
    return idxs;
  }, [data]);

  const activeModel = MODELS.find((m) => m.key === model) ?? MODELS[0];

  return (
    <div className="wv-root fp-tool">
      <style>{CSS}</style>

      {/* Search */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, position: "relative" }}>
        <div style={{ flex: "1 1 280px", position: "relative" }}>
          <IconSearch
            size={16}
            stroke={1.8}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}
          />
          <input
            type="search"
            placeholder={t("wt_search_ph")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "11px 12px 11px 36px",
              borderRadius: 14,
              border: "1px solid var(--line, #e5e7eb)",
              background: "var(--surface, #fff)",
              color: "inherit",
              fontSize: 14,
            }}
          />
          {suggests.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 4,
                background: "var(--surface, #fff)",
                border: "1px solid var(--line, #e5e7eb)",
                borderRadius: 14,
                boxShadow: "0 8px 24px rgba(0,0,0,.08)",
                zIndex: 10,
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              {suggests.map((s) => (
                <button
                  key={`${s.id}-${s.latitude}`}
                  type="button"
                  onClick={() => {
                    setLoc(s);
                    setQuery("");
                    setSuggests([]);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "11px 14px",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    borderBottom: "1px solid var(--line, #f1f5f9)",
                    fontSize: 13,
                    color: "inherit",
                  }}
                >
                  <b>{s.name}</b>
                  <span style={{ opacity: 0.6, marginLeft: 6 }}>
                    {[s.admin1, s.country].filter(Boolean).join(", ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={useMyLocation} leftIcon={<IconCurrentLocation size={14} />}>
          {t("wt_my_loc")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => load(loc, model)}
          loading={loading}
          leftIcon={!loading ? <IconRefresh size={14} /> : undefined}
        >
          {t("wt_refresh")}
        </Button>
      </div>

      {/* Model switcher */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
          {lang === "vi" ? "Mô hình dự báo" : "Forecast model"}
        </div>
        <div className="wv-models">
          {MODELS.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`wv-model-btn${m.key === model ? " active" : ""}`}
              onClick={() => setModel(m.key)}
              title={m.sub[lang]}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
          {activeModel.sub[lang]}
        </div>
      </div>

      {err && (
        <Alert tone="danger" title={t("wt_err_title")}>
          {err}
        </Alert>
      )}

      {/* Hero */}
      {loading && !data ? (
        <Card padding="lg" variant="outline" style={{ borderRadius: 24 }}>
          <Skeleton width={200} height={20} />
          <div style={{ marginTop: 24 }}>
            <Skeleton width={200} height={110} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Skeleton width={160} height={20} />
          </div>
        </Card>
      ) : current && currentDesc && data ? (
        <>
          <Card padding="none" variant="outline" className="wv-hero">
            <WeatherAnim scene={scene} isDay={!!current.is_day} hour={nowHour} />

            <div className="wv-hero-top">
              <IconMapPin size={14} stroke={2} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {loc.name}
                {loc.country ? <span style={{ opacity: 0.75 }}> · {loc.country}</span> : null}
              </span>
              <span className="wv-live-dot">
                <i />
                {t("wt_live")}
              </span>
              <span className="wv-model-pill">{activeModel.label}</span>
            </div>

            <div className="wv-hero-main">
              <div className="wv-city">{loc.name}</div>
              <div className="wv-temp">{Math.round(current.temperature_2m)}°</div>
              <div className="wv-cond">{t(currentDesc.key as never)}</div>
              <div className="wv-hilo">
                H:{Math.round(todayMax ?? current.temperature_2m)}°
                <span style={{ margin: "0 8px", opacity: 0.5 }}>·</span>
                L:{Math.round(todayMin ?? current.temperature_2m)}°
              </div>
            </div>
          </Card>

          {/* Narrative */}
          <div className="wv-blur">
            <div className="wv-narrative">{narrativeText(data, lang)}</div>

            {/* Hourly line chart */}
            <h3 className="wv-sec-head">
              <IconClock size={13} stroke={2} />
              {t("wt_next24")}
            </h3>
            <HourlyChart data={data} next24={next24} lang={lang} />
          </div>

          {/* 10-day forecast */}
          <div className="wv-blur">
            <h3 className="wv-sec-head">
              <IconCalendar size={13} stroke={2} />
              {lang === "vi" ? "Dự báo 10 ngày" : "10-day forecast"}
            </h3>
            {(() => {
              const weekMin = Math.min(...data.daily.temperature_2m_min);
              const weekMax = Math.max(...data.daily.temperature_2m_max);
              const span = Math.max(1, weekMax - weekMin);
              const nowTemp = current?.temperature_2m ?? null;
              return (
                <div className="wv-day-list">
                  {data.daily.time.map((day, i) => {
                    const d = describe(data.daily.weather_code[i]);
                    const DIcon = d.icon;
                    const lo = data.daily.temperature_2m_min[i];
                    const hi = data.daily.temperature_2m_max[i];
                    const leftPct = ((lo - weekMin) / span) * 100;
                    const widthPct = ((hi - lo) / span) * 100;
                    const nowPct =
                      i === 0 && nowTemp != null
                        ? Math.max(0, Math.min(100, ((nowTemp - weekMin) / span) * 100))
                        : null;
                    const rain = data.daily.precipitation_probability_max[i] ?? 0;
                    return (
                      <div key={day} className="wv-day">
                        <span className="wv-day-name">
                          {i === 0 ? t("wt_today") : fmtDayName(day, lang)}
                        </span>
                        <DIcon size={22} stroke={1.7} style={{ color: iconColor(data.daily.weather_code[i], day, data), opacity: 0.9 }} />
                        <span className="wv-day-rain">
                          {rain >= 15 ? (
                            <>
                              <IconDroplets size={12} stroke={2} /> {rain}%
                            </>
                          ) : null}
                        </span>
                        <div className="wv-day-bar-wrap">
                          <span className="wv-day-lo">{Math.round(lo)}°</span>
                          <div className="wv-day-bar">
                            <div className="wv-day-bar-fill" style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
                            {nowPct != null && <div className="wv-day-bar-now" style={{ left: `${nowPct}%` }} />}
                          </div>
                          <span className="wv-day-hi">{Math.round(hi)}°</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Detail cards grid */}
          <div className="wv-blur">
            <h3 className="wv-sec-head">
              <IconGauge size={13} stroke={2} />
              {lang === "vi" ? "Chi tiết" : "Details"}
            </h3>
            <div className="wv-detail-grid">
              {/* AQI */}
              {air?.current.european_aqi != null && (() => {
                const info = aqiInfo(air.current.european_aqi, lang);
                return (
                  <div className="wv-dcard">
                    <div className="wv-dcard-head">
                      <IconLeaf size={13} />
                      {lang === "vi" ? "Chất lượng kk" : "Air quality"}
                    </div>
                    <div className="wv-dcard-val">{Math.round(air.current.european_aqi)}</div>
                    <div className="wv-dcard-bar">
                      <div className="wv-dcard-bar-fill" style={{ width: `${Math.min(100, air.current.european_aqi)}%`, background: info.color }} />
                    </div>
                    <div className="wv-dcard-sub" style={{ color: info.color, fontWeight: 600 }}>
                      {info.label}
                      {air.current.pm2_5 != null && (
                        <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: 6 }}>
                          · PM2.5 {air.current.pm2_5.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* UV */}
              <div className="wv-dcard">
                <div className="wv-dcard-head">
                  <IconSun size={13} />
                  {lang === "vi" ? "Chỉ số UV" : "UV Index"}
                </div>
                <div className="wv-dcard-val">
                  {Math.round(current.uv_index ?? data.daily.uv_index_max[0] ?? 0)}
                </div>
                <div className="wv-dcard-bar">
                  <div
                    className="wv-dcard-bar-fill"
                    style={{
                      width: `${Math.min(100, ((current.uv_index ?? 0) / 11) * 100)}%`,
                      background: "linear-gradient(90deg, #22c55e, #eab308, #ef4444, #a855f7)",
                    }}
                  />
                </div>
                <div className="wv-dcard-sub">
                  {uvLabel(current.uv_index ?? data.daily.uv_index_max[0] ?? 0, lang)}
                </div>
              </div>

              {/* Wind */}
              <div className="wv-dcard">
                <div className="wv-dcard-head">
                  <IconWind size={13} />
                  {lang === "vi" ? "Gió" : "Wind"}
                </div>
                <div className="wv-dcard-val">
                  {current.wind_speed_10m.toFixed(0)}
                  <span style={{ fontSize: 14, opacity: 0.6, marginLeft: 4 }}>km/h</span>
                </div>
                <div className="wv-dcard-sub">
                  {windDirText(current.wind_direction_10m, lang)}
                  {current.wind_gusts_10m != null && (
                    <span style={{ opacity: 0.7, marginLeft: 6 }}>
                      · {lang === "vi" ? "Giật" : "Gust"} {Math.round(current.wind_gusts_10m)}
                    </span>
                  )}
                </div>
              </div>

              {/* Feels like */}
              <div className="wv-dcard">
                <div className="wv-dcard-head">
                  <IconTemperature size={13} />
                  {lang === "vi" ? "Cảm giác" : "Feels like"}
                </div>
                <div className="wv-dcard-val">{Math.round(current.apparent_temperature)}°</div>
                <div className="wv-dcard-sub">
                  {current.apparent_temperature > current.temperature_2m + 1
                    ? lang === "vi"
                      ? "Nóng hơn thực tế"
                      : "Warmer than actual"
                    : current.apparent_temperature < current.temperature_2m - 1
                    ? lang === "vi"
                      ? "Lạnh hơn thực tế"
                      : "Cooler than actual"
                    : lang === "vi"
                    ? "Tương đương"
                    : "Similar to actual"}
                </div>
              </div>

              {/* Humidity */}
              <div className="wv-dcard">
                <div className="wv-dcard-head">
                  <IconDroplet size={13} />
                  {lang === "vi" ? "Độ ẩm" : "Humidity"}
                </div>
                <div className="wv-dcard-val">
                  {current.relative_humidity_2m}
                  <span style={{ fontSize: 14, opacity: 0.6, marginLeft: 2 }}>%</span>
                </div>
                <div className="wv-dcard-bar">
                  <div className="wv-dcard-bar-fill" style={{ width: `${current.relative_humidity_2m}%`, background: "#38bdf8" }} />
                </div>
                <div className="wv-dcard-sub">
                  {current.dew_point_2m != null
                    ? `${lang === "vi" ? "Điểm sương" : "Dew"} ${Math.round(current.dew_point_2m)}°`
                    : ""}
                </div>
              </div>

              {/* Visibility */}
              <div className="wv-dcard">
                <div className="wv-dcard-head">
                  <IconEye size={13} />
                  {lang === "vi" ? "Tầm nhìn" : "Visibility"}
                </div>
                <div className="wv-dcard-val">
                  {current.visibility != null ? (current.visibility / 1000).toFixed(0) : "—"}
                  <span style={{ fontSize: 14, opacity: 0.6, marginLeft: 4 }}>km</span>
                </div>
                <div className="wv-dcard-sub">
                  {current.visibility != null && current.visibility >= 10000
                    ? lang === "vi"
                      ? "Rất tốt"
                      : "Perfectly clear"
                    : lang === "vi"
                    ? "Hạn chế"
                    : "Limited"}
                </div>
              </div>

              {/* Pressure */}
              <div className="wv-dcard">
                <div className="wv-dcard-head">
                  <IconGauge size={13} />
                  {lang === "vi" ? "Áp suất" : "Pressure"}
                </div>
                <div className="wv-dcard-val">
                  {Math.round(current.surface_pressure)}
                  <span style={{ fontSize: 14, opacity: 0.6, marginLeft: 4 }}>hPa</span>
                </div>
                <div className="wv-dcard-sub">
                  {current.surface_pressure > 1013
                    ? lang === "vi"
                      ? "Cao"
                      : "High"
                    : lang === "vi"
                    ? "Thấp"
                    : "Low"}
                </div>
              </div>

              {/* Precipitation */}
              <div className="wv-dcard">
                <div className="wv-dcard-head">
                  <IconUmbrella size={13} />
                  {lang === "vi" ? "Mưa 24h" : "Rain 24h"}
                </div>
                <div className="wv-dcard-val">
                  {(data.daily.precipitation_sum[0] ?? 0).toFixed(1)}
                  <span style={{ fontSize: 14, opacity: 0.6, marginLeft: 4 }}>mm</span>
                </div>
                <div className="wv-dcard-sub">
                  {(data.daily.precipitation_probability_max[0] ?? 0)}% {lang === "vi" ? "khả năng" : "chance"}
                </div>
              </div>
            </div>
          </div>

          {/* Sunrise/Sunset */}
          {data.daily.sunrise?.[0] && data.daily.sunset?.[0] && (() => {
            const now = new Date(current.time).getTime();
            const sr = new Date(data.daily.sunrise[0]).getTime();
            const ss = new Date(data.daily.sunset[0]).getTime();
            const t = Math.max(0, Math.min(1, (now - sr) / (ss - sr)));
            const cx = 20 + t * 260;
            const cy = 80 - Math.sin(t * Math.PI) * 65;
            const ms = ss - sr;
            const h = Math.floor(ms / 3_600_000);
            const m = Math.floor((ms % 3_600_000) / 60_000);
            return (
              <div className="wv-blur">
                <h3 className="wv-sec-head">
                  <IconSunHigh size={13} stroke={2} />
                  {lang === "vi" ? "Mặt trời & Mặt trăng" : "Sun & Moon"}
                </h3>
                <div className="wv-sun-wrap">
                  <svg viewBox="0 0 300 90" width="100%" height="90" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="wv-arc" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0" stopColor="#fbbf24" />
                        <stop offset=".5" stopColor="#f97316" />
                        <stop offset="1" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <path d="M 20 80 Q 150 -40 280 80" fill="none" stroke="var(--line, rgba(120,120,128,.2))" strokeWidth="1.5" strokeDasharray="3 4" />
                    <path d="M 20 80 Q 150 -40 280 80" fill="none" stroke="url(#wv-arc)" strokeWidth="2.5" strokeDasharray={`${t * 360} 400`} />
                    <line x1="20" y1="80" x2="280" y2="80" stroke="var(--line, rgba(120,120,128,.2))" strokeWidth="1" />
                    <circle cx={cx} cy={cy} r="8" fill="#fbbf24" stroke="#fff" strokeWidth="2" />
                    <circle cx={cx} cy={cy} r="14" fill="#fbbf24" opacity=".2" />
                  </svg>
                </div>
                <div className="wv-sun-times">
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IconSunHigh size={12} stroke={2} />
                      {lang === "vi" ? "Bình minh" : "Sunrise"}
                    </span>
                    <b>{fmtTime(data.daily.sunrise[0])}</b>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span>{lang === "vi" ? "Ban ngày" : "Daylight"}</span>
                    <b>{lang === "vi" ? `${h}g ${m}p` : `${h}h ${m}m`}</b>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IconSunset size={12} stroke={2} />
                      {lang === "vi" ? "Hoàng hôn" : "Sunset"}
                    </span>
                    <b>{fmtTime(data.daily.sunset[0])}</b>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      ) : null}

      <div style={{ marginTop: 20, fontSize: 12, opacity: 0.55, textAlign: "center", lineHeight: 1.6 }}>
        <div>
          {lang === "vi" ? "Nguồn: " : "Source: "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
          {" · "}
          {lang === "vi" ? "Mô hình: " : "Model: "}
          <b>{activeModel.label}</b>
        </div>
        <div style={{ marginTop: 4 }}>
          {lang === "vi"
            ? "ECMWF thường chính xác nhất cho khu vực nhiệt đới Đông Nam Á. Với cảnh báo bão/áp thấp hãy đối chiếu thêm nchmf.gov.vn."
            : "ECMWF is typically the most accurate for tropical Southeast Asia. Cross-check nchmf.gov.vn for storm warnings."}
        </div>
      </div>
    </div>
  );
}

function iconColor(code: number, iso: string, data: WeatherData): string {
  const sr = data.daily.sunrise?.[0] ? new Date(data.daily.sunrise[0]).getTime() : 0;
  const ss = data.daily.sunset?.[0] ? new Date(data.daily.sunset[0]).getTime() : 0;
  const t = new Date(iso).getTime();
  const isDay = !sr || !ss ? new Date(iso).getHours() >= 6 && new Date(iso).getHours() < 18 : t >= sr && t <= ss;
  const scene = sceneOf(code, isDay ? 1 : 0);
  switch (scene) {
    case "clear":
      return isDay ? "#f59e0b" : "#818cf8";
    case "cloud":
      return "#94a3b8";
    case "rain":
      return "#38bdf8";
    case "snow":
      return "#93c5fd";
    case "storm":
      return "#a78bfa";
    case "fog":
      return "#94a3b8";
  }
}

function HourlyChart({
  data,
  next24,
  lang,
}: {
  data: WeatherData;
  next24: number[];
  lang: "vi" | "en";
}) {
  if (next24.length === 0) return null;
  const temps = next24.map((i) => data.hourly.temperature_2m[i]);
  const minT = Math.min(...temps) - 2;
  const maxT = Math.max(...temps) + 2;
  const span = Math.max(1, maxT - minT);
  const W = Math.max(560, next24.length * 56);
  const H = 150;
  const stepX = W / (next24.length - 1 || 1);
  const points = temps.map((t, i) => {
    const x = i * stepX;
    const y = ((maxT - t) / span) * 100 + 20;
    return { x, y, t };
  });
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cpx = (p0.x + p1.x) / 2;
    pathD += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const last = points[points.length - 1];
  const areaD = `${pathD} L ${last.x} ${H} L 0 ${H} Z`;

  return (
    <div className="wv-hourly-wrap">
      <div className="wv-hourly-chart">
        <svg className="wv-hourly-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="wv-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="1" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wv-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#60a5fa" />
              <stop offset=".5" stopColor="#fbbf24" />
              <stop offset="1" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#wv-area)" />
          <path d={pathD} fill="none" stroke="url(#wv-line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => {
            const idx = next24[i];
            const d = describe(data.hourly.weather_code[idx]);
            const Icon = d.icon;
            const hourIso = data.hourly.time[idx];
            const isNow = i === 0;
            const rain = data.hourly.precipitation_probability[idx] ?? 0;
            const col = iconColor(data.hourly.weather_code[idx], hourIso, data);
            return (
              <g key={i} transform={`translate(${p.x}, 0)`}>
                <circle cx="0" cy={p.y} r={isNow ? 5 : 3} fill={isNow ? "#fff" : col} stroke={col} strokeWidth={isNow ? 2.5 : 0} />
                <text x="0" y={p.y - 10} textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
                  {Math.round(p.t)}°
                </text>
                <foreignObject x="-12" y={H - 46} width="24" height="24">
                  <div style={{ display: "flex", justifyContent: "center", color: col }}>
                    <Icon size={18} stroke={1.8} />
                  </div>
                </foreignObject>
                <text x="0" y={H - 16} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.65">
                  {isNow ? (lang === "vi" ? "Bây giờ" : "Now") : fmtHour(hourIso)}
                </text>
                {rain >= 30 && (
                  <text x="0" y={H - 2} textAnchor="middle" fontSize="10" fill="#38bdf8" fontWeight="600">
                    {rain}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
