/** Real station observations (METAR) and how they override the forecast model. */

export type MetarReport = {
  icaoId: string;
  name?: string | null;
  obsTime: number;
  temp: number | null;
  dewp: number | null;
  wdir: number | string | null;
  wspd: number | null;
  visib: number | string | null;
  altim: number | null;
  wxString?: string | null;
  lat: number;
  lon: number;
  elev: number | null;
  cover?: string | null;
  clouds?: { cover: string; base?: number | null }[] | null;
};

export type Observation = {
  stationId: string;
  stationName: string;
  distanceKm: number;
  /** Station elevation in metres. */
  elevation: number | null;
  /** Unix milliseconds. */
  observedAt: number;
  temperature: number;
  dewPoint: number;
  humidity: number;
  apparent: number;
  windKmh: number | null;
  windDir: number | null;
  pressure: number | null;
  visibilityM: number | null;
  cloudCover: number | null;
  /** WMO code, or null when the report does not say enough to derive one. */
  weatherCode: number | null;
  raining: boolean;
};

export type ForecastCurrent = {
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

export type ForecastDaily = {
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

export type ForecastHourly = {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
  precipitation_probability: number[];
};

export type Forecast = {
  current: ForecastCurrent;
  daily: ForecastDaily;
  hourly: ForecastHourly;
  timezone: string;
  elevation?: number;
};

export const STATION_MAX_KM = 40;
export const STATION_MAX_AGE_MS = 90 * 60 * 1000;
export const STATION_MAX_ELEV_DIFF_M = 150;
/** Hours over which the gap between station and model fades out. */
const BIAS_FADE_HOURS = 6;

const COVER_PCT: Record<string, number> = {
  CAVOK: 0,
  CLR: 0,
  SKC: 0,
  NSC: 0,
  NCD: 0,
  FEW: 20,
  SCT: 40,
  BKN: 75,
  OVC: 100,
  OVX: 100,
};

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function cloudCoverOf(r: MetarReport): number | null {
  const layers = (r.clouds ?? [])
    .map((c) => COVER_PCT[c.cover])
    .filter((v): v is number => v != null);
  if (layers.length > 0) return Math.max(...layers);
  return r.cover ? COVER_PCT[r.cover] ?? null : null;
}

function skyCode(cover: number | null): number | null {
  if (cover == null) return null;
  if (cover === 0) return 0;
  if (cover <= 20) return 1;
  if (cover <= 40) return 2;
  return 3;
}

/** METAR present-weather groups to a WMO code. Nearby-only (VC) groups are ignored. */
function precipCode(wx: string | null | undefined): number | null {
  const tokens = (wx ?? "")
    .trim()
    .split(/\s+/)
    .filter((t) => t && !t.startsWith("VC"))
    .map((t) => ({
      body: t.replace(/^[+-]/, ""),
      level: t.startsWith("+") ? 2 : t.startsWith("-") ? 0 : 1,
    }));
  const find = (test: (b: string) => boolean) => tokens.find((t) => test(t.body));

  const storm = find((b) => b.includes("TS"));
  if (storm) return storm.body.includes("GR") ? 96 : 95;
  const snow = find((b) => b.includes("SN"));
  if (snow) return [71, 73, 75][snow.level];
  const shower = find((b) => b.includes("SH") && b.includes("RA"));
  if (shower) return [80, 81, 82][shower.level];
  const rain = find((b) => b.includes("RA"));
  if (rain) return [61, 63, 65][rain.level];
  const drizzle = find((b) => b.includes("DZ"));
  if (drizzle) return [51, 53, 55][drizzle.level];
  if (find((b) => b === "FG" || b === "FZFG")) return 45;
  return null;
}

function humidityOf(temp: number, dew: number) {
  const f = (x: number) => Math.exp((17.625 * x) / (243.04 + x));
  return Math.min(100, Math.round((100 * f(dew)) / f(temp)));
}

/** Steadman apparent temperature, the same formula family Open-Meteo reports. */
function apparentOf(temp: number, humidity: number, windKmh: number) {
  const vapour = (humidity / 100) * 6.105 * Math.exp((17.27 * temp) / (237.7 + temp));
  return temp + 0.33 * vapour - 0.7 * (windKmh / 3.6) - 4;
}

function visibilityOf(v: MetarReport["visib"]): number | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim().endsWith("+")) return 10000;
  const miles = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(miles) ? Math.min(10000, Math.round(miles * 1609.34)) : null;
}

/** Nearest fresh report with a usable temperature, or null. */
export function pickObservation(
  reports: MetarReport[],
  lat: number,
  lon: number,
  now: number,
): Observation | null {
  const nearest = reports
    .filter(
      (r) => r.temp != null && r.dewp != null && now - r.obsTime * 1000 <= STATION_MAX_AGE_MS,
    )
    .map((r) => ({ r, km: distanceKm(lat, lon, r.lat, r.lon) }))
    .filter((c) => c.km <= STATION_MAX_KM)
    .sort((a, b) => a.km - b.km)[0];
  if (!nearest) return null;

  const { r, km } = nearest;
  const temperature = r.temp as number;
  const dewPoint = r.dewp as number;
  const humidity = humidityOf(temperature, dewPoint);
  const windKmh = r.wspd != null ? r.wspd * 1.852 : null;
  const cloudCover = cloudCoverOf(r);
  const precip = precipCode(r.wxString);

  return {
    stationId: r.icaoId,
    stationName: r.name ?? r.icaoId,
    distanceKm: Math.round(km),
    elevation: r.elev,
    observedAt: r.obsTime * 1000,
    temperature,
    dewPoint,
    humidity,
    apparent: apparentOf(temperature, humidity, windKmh ?? 0),
    windKmh,
    windDir: typeof r.wdir === "number" ? r.wdir : null,
    pressure: r.altim,
    visibilityM: visibilityOf(r.visib),
    cloudCover,
    weatherCode: precip ?? skyCode(cloudCover),
    raining: precip != null && precip !== 45,
  };
}

function isRepresentative(obs: Observation, elevation: number | undefined) {
  if (obs.elevation == null || elevation == null) return true;
  return Math.abs(obs.elevation - elevation) <= STATION_MAX_ELEV_DIFF_M;
}

/**
 * Replaces the model's "now" with the station reading and fades the model's
 * temperature error out over the next few hours. Returns null when the
 * station is not representative of the location (for example a valley
 * airport for a hill town).
 */
export function applyObservation(data: Forecast, obs: Observation): Forecast | null {
  if (!isRepresentative(obs, data.elevation)) return null;

  const { current, hourly, daily } = data;
  const nowIdx = hourly.time.findIndex((t) => t.slice(0, 13) === current.time.slice(0, 13));
  // Measured against the hourly series: `current` sits on a 15-minute grid.
  const delta = obs.temperature - (hourly.temperature_2m[nowIdx] ?? current.temperature_2m);
  const temps = hourly.temperature_2m.map((temp, i) => {
    if (nowIdx < 0 || i < nowIdx) return temp;
    return temp + delta * Math.max(0, 1 - (i - nowIdx) / BIAS_FADE_HOURS);
  });

  return {
    ...data,
    current: {
      ...current,
      temperature_2m: obs.temperature,
      apparent_temperature: obs.apparent,
      relative_humidity_2m: obs.humidity,
      dew_point_2m: obs.dewPoint,
      weather_code: obs.weatherCode ?? current.weather_code,
      wind_speed_10m: obs.windKmh ?? current.wind_speed_10m,
      wind_direction_10m: obs.windDir ?? current.wind_direction_10m,
      surface_pressure: obs.pressure ?? current.surface_pressure,
      cloud_cover: obs.cloudCover ?? current.cloud_cover,
      visibility: obs.visibilityM ?? current.visibility,
      precipitation: obs.raining ? current.precipitation : 0,
    },
    hourly: { ...hourly, temperature_2m: temps },
    daily: {
      ...daily,
      temperature_2m_max: daily.temperature_2m_max.map((v, i) =>
        i === 0 ? Math.max(v, obs.temperature) : v,
      ),
      temperature_2m_min: daily.temperature_2m_min.map((v, i) =>
        i === 0 ? Math.min(v, obs.temperature) : v,
      ),
    },
  };
}
