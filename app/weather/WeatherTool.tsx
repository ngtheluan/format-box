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
  precipitation_probability_max: number[];
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
};

type WeatherData = {
  current: CurrentWeather;
  daily: Daily;
  hourly: Hourly;
  timezone: string;
};

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

function WeatherAnim({ scene, isDay }: { scene: Scene; isDay: boolean }) {
  const bg: Record<Scene, string> = {
    clear: isDay
      ? "linear-gradient(135deg, #fde68a 0%, #fbbf24 60%, #f59e0b 100%)"
      : "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)",
    cloud: "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
    rain: "linear-gradient(135deg, #475569 0%, #1e293b 100%)",
    snow: "linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)",
    storm: "linear-gradient(135deg, #1f2937 0%, #0f172a 100%)",
    fog: "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
  };
  return (
    <div className="wt-anim" style={{ background: bg[scene] }} aria-hidden>
      {scene === "clear" && isDay && (
        <>
          <div className="wt-sun" />
          <div className="wt-sun-rays" />
        </>
      )}
      {scene === "clear" && !isDay && (
        <>
          <div className="wt-moon" />
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="wt-star"
              style={{
                left: `${(i * 53) % 100}%`,
                top: `${(i * 37) % 90}%`,
                animationDelay: `${(i % 5) * 0.4}s`,
              }}
            />
          ))}
        </>
      )}
      {(scene === "cloud" || scene === "rain" || scene === "storm" || scene === "fog") && (
        <>
          <div className="wt-cloud wt-cloud-1" />
          <div className="wt-cloud wt-cloud-2" />
          <div className="wt-cloud wt-cloud-3" />
        </>
      )}
      {scene === "rain" &&
        Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="wt-drop"
            style={{
              left: `${(i * 2.7) % 100}%`,
              animationDelay: `${(i % 10) * 0.15}s`,
              animationDuration: `${0.6 + ((i * 13) % 40) / 100}s`,
            }}
          />
        ))}
      {scene === "storm" && (
        <>
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="wt-drop"
              style={{
                left: `${(i * 2.1) % 100}%`,
                animationDelay: `${(i % 10) * 0.12}s`,
                animationDuration: `${0.5 + ((i * 11) % 40) / 100}s`,
              }}
            />
          ))}
          <div className="wt-bolt" />
        </>
      )}
      {scene === "snow" &&
        Array.from({ length: 35 }).map((_, i) => {
          const sz = 8 + (i % 4) * 3;
          return (
            <div
              key={i}
              className="wt-flake"
              style={{
                left: `${(i * 3.1) % 100}%`,
                animationDelay: `${(i % 8) * 0.5}s`,
                animationDuration: `${4 + ((i * 7) % 40) / 10}s`,
                width: sz,
                height: sz,
              }}
            >
              <svg viewBox="0 0 24 24" width={sz} height={sz} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v18M4.5 7.5l15 9M4.5 16.5l15-9" />
              </svg>
            </div>
          );
        })}
      {scene === "fog" && (
        <>
          <div className="wt-fog wt-fog-1" />
          <div className="wt-fog wt-fog-2" />
        </>
      )}
    </div>
  );
}

const ANIM_CSS = `
.wt-anim {
  position: absolute; inset: 0; overflow: hidden; border-radius: inherit;
  z-index: 0; pointer-events: none;
}
.wt-anim::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.35) 100%);
  pointer-events: none;
}
.wt-hero { position: relative; overflow: hidden; color: #fff; border: none !important; }
.wt-hero > *:not(.wt-anim) { position: relative; z-index: 1; }
.wt-hero * { color: #fff; }

.wt-glass {
  background: rgba(255,255,255,.14);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.22);
  border-radius: 14px;
  padding: 12px 14px;
  color: #fff;
}
.wt-glass-lbl {
  display: flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 600;
  letter-spacing: .05em; text-transform: uppercase;
  color: rgba(255,255,255,.75);
}
.wt-glass-val { font-size: 22px; font-weight: 600; margin-top: 6px; line-height: 1.15; }
.wt-glass-sub { font-size: 11px; color: rgba(255,255,255,.72); margin-top: 2px; }

/* Section header (hourly / daily cards) */
.wt-sec-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  opacity: .55; margin: 0 0 12px; padding-bottom: 10px;
  border-bottom: 1px solid var(--line, rgba(0,0,0,.06));
}

/* Hourly row */
.wt-hourly-row { display: flex; gap: 4px; overflow-x: auto; padding: 4px 0 8px; scroll-snap-type: x mandatory; }
.wt-hourly-row::-webkit-scrollbar { height: 4px; }
.wt-hourly-row::-webkit-scrollbar-thumb { background: var(--line, rgba(0,0,0,.15)); border-radius: 4px; }
.wt-hour {
  display: flex; flex-direction: column; align-items: center;
  min-width: 56px; padding: 10px 6px; border-radius: 12px;
  flex-shrink: 0; scroll-snap-align: start;
  transition: background .15s;
}
.wt-hour:hover { background: var(--surface-2, rgba(0,0,0,.03)); }
.wt-hour-time { font-size: 11px; font-weight: 500; opacity: .6; }
.wt-hour-now {
  font-size: 10px; font-weight: 700; color: #6366f1;
  letter-spacing: .05em; text-transform: uppercase;
}
.wt-hour-icon { margin: 8px 0 6px; }
.wt-hour-temp { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; }
.wt-hour-rain {
  display: flex; align-items: center; gap: 2px;
  font-size: 10px; margin-top: 4px; color: #38bdf8; font-weight: 600;
  min-height: 14px;
}

/* Daily row */
.wt-day-list { display: flex; flex-direction: column; }
.wt-day {
  display: grid;
  grid-template-columns: 54px 26px 40px 1fr auto;
  align-items: center; gap: 10px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--line, rgba(0,0,0,.05));
  font-size: 14px;
}
.wt-day:last-child { border-bottom: none; }
.wt-day-name { font-weight: 600; letter-spacing: -0.01em; }
.wt-day-icon { color: var(--wt-day-ic, currentColor); opacity: .9; }
.wt-day-rain {
  display: inline-flex; align-items: center; gap: 2px;
  font-size: 11px; color: #38bdf8; font-weight: 600; min-height: 14px;
}
.wt-day-bar-wrap {
  display: flex; align-items: center; gap: 10px;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
.wt-day-lo { opacity: .5; min-width: 26px; text-align: right; }
.wt-day-hi { font-weight: 600; min-width: 26px; }
.wt-day-bar {
  position: relative; flex: 1; min-width: 60px; height: 5px;
  background: var(--line, rgba(0,0,0,.08)); border-radius: 999px;
  overflow: hidden;
}
.wt-day-bar-fill {
  position: absolute; top: 0; bottom: 0; border-radius: 999px;
  background: linear-gradient(90deg, #60a5fa 0%, #34d399 40%, #fbbf24 70%, #fb7185 100%);
}
.wt-day-bar-now {
  position: absolute; top: 50%; width: 8px; height: 8px;
  background: #fff; border: 2px solid #6366f1;
  border-radius: 50%; transform: translate(-50%, -50%);
  box-shadow: 0 0 0 2px rgba(99,102,241,.15);
}

/* Precipitation mini chart */
.wt-precip {
  display: grid; grid-template-columns: 1fr; gap: 6px;
  margin-top: 12px;
}
.wt-precip-head {
  display: flex; align-items: baseline; justify-content: space-between;
  font-size: 11px; opacity: .6;
}
.wt-precip-bars {
  display: grid; grid-auto-columns: 1fr; grid-auto-flow: column;
  align-items: end; gap: 3px; height: 56px;
  padding: 4px 2px; border-radius: 8px;
  background: var(--surface-2, rgba(0,0,0,.02));
}
.wt-precip-bar {
  height: 100%; display: flex; flex-direction: column; justify-content: flex-end;
  align-items: stretch; position: relative;
}
.wt-precip-bar-fill {
  background: linear-gradient(to top, #38bdf8, #60a5fa);
  border-radius: 3px 3px 1px 1px;
  min-height: 2px; transition: height .3s;
}
.wt-precip-bar-empty { background: var(--line, rgba(0,0,0,.06)); border-radius: 2px; min-height: 2px; }
.wt-precip-axis {
  display: grid; grid-auto-columns: 1fr; grid-auto-flow: column;
  gap: 3px; padding: 0 2px;
  font-size: 9px; opacity: .55; text-align: center;
}

/* Sun arc */
.wt-sun-card {
  margin-top: 14px; padding: 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(251,191,36,.08), rgba(99,102,241,.08));
  border: 1px solid var(--line, rgba(0,0,0,.06));
}
.wt-sun-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  opacity: .55; margin-bottom: 12px;
}
.wt-sun-arc-wrap { position: relative; height: 80px; margin: 0 4px; }
.wt-sun-times {
  display: flex; justify-content: space-between; margin-top: 4px;
  font-size: 12px; font-variant-numeric: tabular-nums;
}
.wt-sun-times b { font-weight: 600; }
.wt-sun-times span { display: block; font-size: 10px; opacity: .55; letter-spacing: .04em; text-transform: uppercase; }

.wt-sun {
  position: absolute; right: 8%; top: 12%;
  width: 90px; height: 90px; border-radius: 50%;
  background: radial-gradient(circle, #fffbeb 0%, #fde047 55%, #f59e0b 100%);
  box-shadow: 0 0 60px rgba(253,224,71,.8);
  animation: wt-pulse 4s ease-in-out infinite;
}
.wt-sun-rays {
  position: absolute; right: calc(8% - 30px); top: calc(12% - 30px);
  width: 150px; height: 150px;
  background: conic-gradient(from 0deg, transparent 0deg 20deg, rgba(255,255,255,.35) 20deg 30deg, transparent 30deg 60deg, rgba(255,255,255,.25) 60deg 70deg, transparent 70deg);
  border-radius: 50%;
  animation: wt-spin 30s linear infinite;
  filter: blur(1px);
}
.wt-moon {
  position: absolute; right: 10%; top: 15%;
  width: 60px; height: 60px; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #f1f5f9 0%, #cbd5e1 100%);
  box-shadow: 0 0 40px rgba(203,213,225,.5);
}
.wt-star {
  position: absolute; width: 2px; height: 2px;
  background: #fff; border-radius: 50%;
  animation: wt-twinkle 2s ease-in-out infinite;
}
.wt-cloud {
  position: absolute; height: 40px; border-radius: 40px;
  background: rgba(255,255,255,.35);
  filter: blur(2px);
  animation: wt-drift linear infinite;
}
.wt-cloud::before, .wt-cloud::after {
  content: ""; position: absolute; background: inherit; border-radius: 50%;
}
.wt-cloud::before { width: 40px; height: 40px; top: -18px; left: 15px; }
.wt-cloud::after { width: 30px; height: 30px; top: -12px; left: 45px; }
.wt-cloud-1 { width: 90px; top: 15%; animation-duration: 40s; }
.wt-cloud-2 { width: 120px; top: 45%; animation-duration: 55s; animation-delay: -20s; background: rgba(255,255,255,.25); }
.wt-cloud-3 { width: 70px; top: 70%; animation-duration: 35s; animation-delay: -10s; background: rgba(255,255,255,.4); }
.wt-drop {
  position: absolute; top: -20px;
  width: 2px; height: 14px;
  background: linear-gradient(to bottom, transparent, rgba(191,219,254,.9));
  animation: wt-fall linear infinite;
}
.wt-flake {
  position: absolute; top: -20px;
  color: rgba(255,255,255,.95);
  animation: wt-snowfall linear infinite;
  text-shadow: 0 0 4px rgba(255,255,255,.5);
}
.wt-bolt {
  position: absolute; inset: 0;
  background: rgba(255,255,255,0);
  animation: wt-flash 5s ease-in-out infinite;
}
.wt-fog {
  position: absolute; left: -20%; right: -20%; height: 80px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);
  filter: blur(8px);
  animation: wt-fog-move linear infinite;
}
.wt-fog-1 { top: 30%; animation-duration: 25s; }
.wt-fog-2 { top: 60%; animation-duration: 35s; animation-direction: reverse; }

@keyframes wt-spin { to { transform: rotate(360deg); } }
@keyframes wt-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes wt-twinkle { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
@keyframes wt-drift {
  from { transform: translateX(-160px); }
  to { transform: translateX(calc(100vw + 160px)); }
}
@keyframes wt-fall {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(320px); opacity: .3; }
}
@keyframes wt-snowfall {
  from { transform: translateY(0) translateX(0); opacity: 1; }
  to { transform: translateY(320px) translateX(30px); opacity: .4; }
}
@keyframes wt-flash {
  0%, 92%, 100% { background: rgba(255,255,255,0); }
  93%, 94% { background: rgba(255,255,255,.7); }
  95% { background: rgba(255,255,255,0); }
  96%, 97% { background: rgba(255,255,255,.5); }
}
@keyframes wt-fog-move {
  from { transform: translateX(-30%); }
  to { transform: translateX(30%); }
}
@media (prefers-reduced-motion: reduce) {
  .wt-anim * { animation: none !important; }
}
`;

const DEFAULT_CITY: GeoResult = {
  id: 1566083,
  name: "Ho Chi Minh City",
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

async function fetchWeather(loc: GeoResult): Promise<WeatherData> {
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
  return (await res.json()) as WeatherData;
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
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

export default function WeatherTool() {
  const { t, lang } = useI18n();
  const [loc, setLoc] = useState<GeoResult>(DEFAULT_CITY);
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [suggests, setSuggests] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async (target: GeoResult) => {
    setLoading(true);
    setErr(null);
    try {
      const w = await fetchWeather(target);
      setData(w);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "unknown");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(loc);
  }, [loc, load]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggests([]);
      return;
    }
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await geocode(query.trim(), lang);
        setSuggests(r);
      } catch {
        setSuggests([]);
      } finally {
        setSearching(false);
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
      (pos) => {
        setLoc({
          id: 0,
          name: t("wt_my_loc_name"),
          country: "",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (e) => setErr(e.message),
      { timeout: 10000 }
    );
  };

  const current = data?.current;
  const currentDesc = current ? describe(current.weather_code) : null;

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

  const scene = current ? sceneOf(current.weather_code, current.is_day) : "cloud";
  const todayMax = data?.daily.temperature_2m_max?.[0];
  const todayMin = data?.daily.temperature_2m_min?.[0];
  const feelsSub = current
    ? current.apparent_temperature > current.temperature_2m + 1
      ? lang === "vi" ? "Nóng hơn" : "Warmer"
      : current.apparent_temperature < current.temperature_2m - 1
      ? lang === "vi" ? "Lạnh hơn" : "Cooler"
      : lang === "vi" ? "Tương đương" : "Similar"
    : "";
  const dewSub = current?.dew_point_2m != null
    ? `${lang === "vi" ? "Điểm sương" : "Dew"} ${Math.round(current.dew_point_2m)}°`
    : "";

  return (
    <div className="fp-tool">
      <style>{ANIM_CSS}</style>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, position: "relative" }}>
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
              padding: "10px 12px 10px 36px",
              borderRadius: 10,
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
                borderRadius: 10,
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
                    padding: "10px 12px",
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
          onClick={() => load(loc)}
          loading={loading}
          leftIcon={!loading ? <IconRefresh size={14} /> : undefined}
        >
          {t("wt_refresh")}
        </Button>
      </div>

      {err && (
        <Alert tone="danger" title={t("wt_err_title")}>
          {err}
        </Alert>
      )}

      {/* Current */}
      {loading && !data ? (
        <Card padding="lg" variant="outline">
          <Skeleton width={200} height={20} />
          <div style={{ marginTop: 16 }}>
            <Skeleton width={140} height={56} />
          </div>
        </Card>
      ) : current && currentDesc ? (
        <Card padding="lg" variant="outline" className="wt-hero">
          <WeatherAnim scene={scene} isDay={!!current.is_day} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 8px", borderRadius: 999,
              background: "rgba(255,255,255,.2)", fontSize: 11, fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
              {t("wt_live")}
            </span>
            <IconMapPin size={14} stroke={2} />
            <b style={{ fontSize: 15 }}>{loc.name}</b>
            {loc.country && <span style={{ opacity: 0.75 }}>· {loc.country}</span>}
            <span style={{ opacity: 0.7, fontSize: 12, marginLeft: "auto" }}>
              {new Date(current.time).toLocaleString(lang === "vi" ? "vi-VN" : "en-US", {
                hour12: false, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit",
              })}
            </span>
          </div>

          {/* Apple-style hero: big temp + condition */}
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div style={{ fontSize: 80, fontWeight: 200, lineHeight: 1, letterSpacing: "-0.03em" }}>
              {Math.round(current.temperature_2m)}°
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, marginTop: 4, textTransform: "capitalize" }}>
              {t(currentDesc.key as never)}
            </div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>
              {t("wt_hi")} {Math.round(todayMax ?? current.temperature_2m)}°
              <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
              {t("wt_lo")} {Math.round(todayMin ?? current.temperature_2m)}°
            </div>
          </div>

          {/* Glass stat grid — Apple weather style */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10,
              marginTop: 16,
            }}
          >
            <GlassStat
              icon={<IconTemperature size={13} />}
              label={t("wt_feels_full")}
              value={`${Math.round(current.apparent_temperature)}°`}
              sub={feelsSub}
            />
            <GlassStat
              icon={<IconWind size={13} />}
              label={t("wt_wind")}
              value={`${current.wind_speed_10m.toFixed(0)} km/h`}
              sub={windDirText(current.wind_direction_10m, lang)}
            />
            <GlassStat
              icon={<IconDroplet size={13} />}
              label={t("wt_humidity")}
              value={`${current.relative_humidity_2m}%`}
              sub={dewSub}
            />
            <GlassStat
              icon={<IconSun size={13} />}
              label={t("wt_uv")}
              value={String(Math.round(current.uv_index ?? data?.daily.uv_index_max[0] ?? 0))}
              sub={uvLabel(current.uv_index ?? data?.daily.uv_index_max[0] ?? 0, lang)}
            />
            <GlassStat
              icon={<IconEye size={13} />}
              label={t("wt_visibility")}
              value={
                current.visibility != null
                  ? `${(current.visibility / 1000).toFixed(0)} km`
                  : "—"
              }
            />
            <GlassStat
              icon={<IconGauge size={13} />}
              label={t("wt_pressure")}
              value={`${Math.round(current.surface_pressure)}`}
              sub="hPa"
            />
            <GlassStat
              icon={<IconCloud size={13} />}
              label={t("wt_cloud")}
              value={`${current.cloud_cover ?? 0}%`}
            />
            <GlassStat
              icon={<IconUmbrella size={13} />}
              label={t("wt_precip")}
              value={`${(current.precipitation ?? 0).toFixed(1)} mm`}
            />
          </div>
        </Card>
      ) : null}

      {/* Hourly + Daily side-by-side on wide screens */}
      {data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
      {next24.length > 0 && (
        <Card padding="md" variant="outline">
          <h3 className="wt-sec-head">
            <IconClock size={13} stroke={2} />
            {t("wt_next24")}
          </h3>
          <div className="wt-hourly-row">
            {next24.map((i, idx) => {
              const d = describe(data.hourly.weather_code[i]);
              const HIcon = d.icon;
              const rain = data.hourly.precipitation_probability[i] ?? 0;
              const hourIso = data.hourly.time[i];
              const isNow = idx === 0;
              const color = iconColor(data.hourly.weather_code[i], hourIso, data);
              return (
                <div key={i} className="wt-hour">
                  {isNow ? (
                    <div className="wt-hour-now">{lang === "vi" ? "Bây giờ" : "Now"}</div>
                  ) : (
                    <div className="wt-hour-time">{fmtHour(hourIso)}</div>
                  )}
                  <HIcon size={22} stroke={1.7} className="wt-hour-icon" style={{ color }} />
                  <div className="wt-hour-temp">{Math.round(data.hourly.temperature_2m[i])}°</div>
                  <div className="wt-hour-rain">
                    {rain >= 15 ? (
                      <>
                        <IconDroplets size={11} stroke={2} /> {rain}%
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Precipitation next 12h */}
          {(() => {
            const slice = next24.slice(0, 12);
            const maxRain = Math.max(10, ...slice.map((i) => data.hourly.precipitation_probability[i] ?? 0));
            return (
              <div className="wt-precip">
                <div className="wt-precip-head">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>
                    <IconDroplets size={12} stroke={2} />
                    {lang === "vi" ? "Xác suất mưa 12h" : "Rain chance 12h"}
                  </span>
                  <span>{maxRain}% {lang === "vi" ? "cao nhất" : "max"}</span>
                </div>
                <div className="wt-precip-bars">
                  {slice.map((i) => {
                    const v = data.hourly.precipitation_probability[i] ?? 0;
                    const h = Math.max(2, (v / 100) * 48);
                    return (
                      <div key={`p${i}`} className="wt-precip-bar" title={`${v}%`}>
                        {v > 0 ? (
                          <div
                            className="wt-precip-bar-fill"
                            style={{ height: `${h}px`, opacity: 0.35 + (v / 100) * 0.65 }}
                          />
                        ) : (
                          <div className="wt-precip-bar-empty" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="wt-precip-axis">
                  {slice.map((i, idx) => (
                    <span key={`a${i}`}>{idx % 2 === 0 ? new Date(data.hourly.time[i]).getHours() + "h" : ""}</span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Sun position arc */}
          {data.daily.sunrise?.[0] && data.daily.sunset?.[0] && current && (() => {
            const now = new Date(current.time).getTime();
            const sr = new Date(data.daily.sunrise[0]).getTime();
            const ss = new Date(data.daily.sunset[0]).getTime();
            const t = Math.max(0, Math.min(1, (now - sr) / (ss - sr)));
            const cx = 20 + t * 260;
            const cy = 70 - Math.sin(t * Math.PI) * 55;
            return (
              <div className="wt-sun-card">
                <div className="wt-sun-head">
                  <IconSun size={13} stroke={2} /> {lang === "vi" ? "Mặt trời" : "Sun"}
                </div>
                <div className="wt-sun-arc-wrap">
                  <svg viewBox="0 0 300 80" width="100%" height="80" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="wt-arc-g" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0" stopColor="#fbbf24" />
                        <stop offset=".5" stopColor="#f97316" />
                        <stop offset="1" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 20 70 Q 150 -40 280 70"
                      fill="none"
                      stroke="var(--line, rgba(0,0,0,.12))"
                      strokeWidth="1.5"
                      strokeDasharray="3 4"
                    />
                    <path
                      d="M 20 70 Q 150 -40 280 70"
                      fill="none"
                      stroke="url(#wt-arc-g)"
                      strokeWidth="2"
                      strokeDasharray={`${t * 340} 400`}
                    />
                    <line x1="20" y1="70" x2="280" y2="70" stroke="var(--line, rgba(0,0,0,.15))" strokeWidth="1" />
                    <circle cx={cx} cy={cy} r="7" fill="#fbbf24" stroke="#fff" strokeWidth="2" />
                    <circle cx={cx} cy={cy} r="12" fill="#fbbf24" opacity=".2" />
                  </svg>
                </div>
                <div className="wt-sun-times">
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-start" }}>
                      <IconSunHigh size={12} stroke={2} /> {lang === "vi" ? "Bình minh" : "Sunrise"}
                    </span>
                    <b>{fmtTime(data.daily.sunrise[0])}</b>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span>{lang === "vi" ? "Ban ngày" : "Daylight"}</span>
                    <b>{daylightDuration(data.daily.sunrise[0], data.daily.sunset[0], lang)}</b>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                      <IconSunset size={12} stroke={2} /> {lang === "vi" ? "Hoàng hôn" : "Sunset"}
                    </span>
                    <b>{fmtTime(data.daily.sunset[0])}</b>
                  </div>
                </div>
              </div>
            );
          })()}
        </Card>
      )}

      {/* Daily */}
        <Card padding="md" variant="outline">
          <h3 className="wt-sec-head">
            <IconCalendar size={13} stroke={2} />
            {t("wt_forecast7")}
          </h3>
          {(() => {
            const weekMin = Math.min(...data.daily.temperature_2m_min);
            const weekMax = Math.max(...data.daily.temperature_2m_max);
            const span = Math.max(1, weekMax - weekMin);
            const nowTemp = current?.temperature_2m ?? null;
            return (
              <div className="wt-day-list">
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
                    <div key={day} className="wt-day">
                      <span className="wt-day-name">
                        {i === 0 ? t("wt_today") : fmtDayName(day, lang)}
                      </span>
                      <DIcon
                        size={22}
                        stroke={1.7}
                        className="wt-day-icon"
                        style={{ color: iconColor(data.daily.weather_code[i], day, data) }}
                      />
                      <span className="wt-day-rain">
                        {rain >= 15 ? (
                          <>
                            <IconDroplets size={12} stroke={2} /> {rain}%
                          </>
                        ) : null}
                      </span>
                      <div className="wt-day-bar-wrap">
                        <span className="wt-day-lo">{Math.round(lo)}°</span>
                        <div className="wt-day-bar">
                          <div
                            className="wt-day-bar-fill"
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          />
                          {nowPct != null && (
                            <div className="wt-day-bar-now" style={{ left: `${nowPct}%` }} />
                          )}
                        </div>
                        <span className="wt-day-hi">{Math.round(hi)}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.6, textAlign: "center" }}>
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{" "}
        — {t("wt_source")}
      </div>
    </div>
  );
}

function GlassStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="wt-glass">
      <div className="wt-glass-lbl">
        {icon}
        {label}
      </div>
      <div className="wt-glass-val">{value}</div>
      {sub && <div className="wt-glass-sub">{sub}</div>}
    </div>
  );
}

function daylightDuration(sr: string, ss: string, lang: "vi" | "en") {
  const ms = new Date(ss).getTime() - new Date(sr).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return lang === "vi" ? `${h}g ${m}p` : `${h}h ${m}m`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function windDirText(deg: number, lang: "vi" | "en") {
  const dirsVi = ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"];
  const dirsEn = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const arr = lang === "vi" ? dirsVi : dirsEn;
  const i = Math.round(deg / 45) % 8;
  return arr[i];
}

function iconColor(code: number, iso: string, data: WeatherData): string {
  // sun/moon based on daylight and category
  const scene = sceneOf(code, isDayAt(iso, data) ? 1 : 0);
  switch (scene) {
    case "clear":
      return isDayAt(iso, data) ? "#f59e0b" : "#818cf8";
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

function isDayAt(iso: string, data: WeatherData): boolean {
  const t = new Date(iso).getTime();
  const sr = data.daily.sunrise?.[0] ? new Date(data.daily.sunrise[0]).getTime() : 0;
  const ss = data.daily.sunset?.[0] ? new Date(data.daily.sunset[0]).getTime() : 0;
  if (!sr || !ss) {
    const h = new Date(iso).getHours();
    return h >= 6 && h < 18;
  }
  // approximate: use hour-of-day compared to sunrise/sunset hours
  const dt = new Date(iso);
  const srH = new Date(data.daily.sunrise[0]);
  const ssH = new Date(data.daily.sunset[0]);
  const minsOfDay = dt.getHours() * 60 + dt.getMinutes();
  const srMin = srH.getHours() * 60 + srH.getMinutes();
  const ssMin = ssH.getHours() * 60 + ssH.getMinutes();
  return minsOfDay >= srMin && minsOfDay <= ssMin;
}

function uvLabel(uv: number, lang: "vi" | "en") {
  if (uv < 3) return lang === "vi" ? "Thấp" : "Low";
  if (uv < 6) return lang === "vi" ? "Trung bình" : "Moderate";
  if (uv < 8) return lang === "vi" ? "Cao" : "High";
  if (uv < 11) return lang === "vi" ? "Rất cao" : "Very high";
  return lang === "vi" ? "Nguy hiểm" : "Extreme";
}
