// Shared types + encoding helpers for the Travel Planner tool.
// Framework-agnostic — safe to import from both client components and API routes.

export type StopCategory =
  | "sight"
  | "eat"
  | "stay"
  | "beach"
  | "mountain"
  | "activity"
  | "transport"
  | "other";

export const STOP_CATEGORIES: StopCategory[] = [
  "sight",
  "eat",
  "stay",
  "beach",
  "mountain",
  "activity",
  "transport",
  "other",
];

export type Stop = {
  id: string;
  time?: string;
  name: string;
  note?: string;
  image?: string;
  category?: StopCategory;
};

export type Day = {
  id: string;
  date?: string;
  title?: string;
  stops: Stop[];
};

export type Trip = {
  title: string;
  subtitle?: string;
  startDate?: string;
  endDate?: string;
  accent: string;
  cover?: string;
  days: Day[];
};

// Preset colour tones. `key` is stable; labels live in i18n.
export type AccentPreset = { key: string; color: string };
export const ACCENT_PRESETS: AccentPreset[] = [
  { key: "coral", color: "#f97316" },
  { key: "rose", color: "#e11d48" },
  { key: "amber", color: "#f59e0b" },
  { key: "emerald", color: "#10b981" },
  { key: "teal", color: "#14b8a6" },
  { key: "ocean", color: "#0ea5e9" },
  { key: "indigo", color: "#6366f1" },
  { key: "violet", color: "#8b5cf6" },
];

export const DEFAULT_ACCENT = ACCENT_PRESETS[0].color;

export const uid = () => Math.random().toString(36).slice(2, 9);

export function emptyStop(): Stop {
  return { id: uid(), name: "", category: "sight" };
}

export function emptyDay(): Day {
  return { id: uid(), stops: [emptyStop()] };
}

export function emptyTrip(): Trip {
  return {
    title: "",
    subtitle: "",
    startDate: "",
    endDate: "",
    accent: DEFAULT_ACCENT,
    cover: "",
    days: [emptyDay()],
  };
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Coerce an arbitrary decoded object into a valid, bounded Trip. Guards the
// public viewer against malformed or oversized share payloads.
export function normalizeTrip(input: unknown): Trip | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const str = (v: unknown, max = 400) => (typeof v === "string" ? v.slice(0, max) : "");

  const accent = typeof o.accent === "string" && HEX_RE.test(o.accent) ? o.accent : DEFAULT_ACCENT;

  const rawDays = Array.isArray(o.days) ? o.days.slice(0, 60) : [];
  const days: Day[] = rawDays.map((d) => {
    const dd = (d ?? {}) as Record<string, unknown>;
    const rawStops = Array.isArray(dd.stops) ? dd.stops.slice(0, 40) : [];
    const stops: Stop[] = rawStops.map((s) => {
      const ss = (s ?? {}) as Record<string, unknown>;
      const cat = ss.category;
      return {
        id: str(ss.id, 20) || uid(),
        time: str(ss.time, 10),
        name: str(ss.name, 160),
        note: str(ss.note, 600),
        image: str(ss.image, 1200),
        category: STOP_CATEGORIES.includes(cat as StopCategory) ? (cat as StopCategory) : "other",
      };
    });
    return {
      id: str(dd.id, 20) || uid(),
      date: str(dd.date, 10),
      title: str(dd.title, 120),
      stops,
    };
  });

  return {
    title: str(o.title, 160),
    subtitle: str(o.subtitle, 200),
    startDate: str(o.startDate, 10),
    endDate: str(o.endDate, 10),
    accent,
    cover: str(o.cover, 1200),
    days: days.length ? days : [emptyDay()],
  };
}

// --- Share-link encoding (UTF-8 safe base64url, no server storage needed) ---

export function encodeTrip(trip: Trip): string {
  const json = JSON.stringify(trip);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeTrip(payload: string): Trip | null {
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return normalizeTrip(JSON.parse(json));
  } catch {
    return null;
  }
}

// --- Image proxy ---

// Route a remote image through our own origin so canvas export (html-to-image)
// stays untainted and hot-link protected sources still render in the viewer.
export function proxiedImage(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("/")) return url;
  return `/api/place-photo/image?url=${encodeURIComponent(url)}`;
}

// SSRF guard for the image proxy: allow any public host, block loopback/private
// ranges and link-local metadata endpoints.
export function isProxyableImageHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  return true;
}

// --- Date helpers ---

export function tripDayCount(trip: Trip): number {
  if (trip.startDate && trip.endDate) {
    const a = new Date(trip.startDate).getTime();
    const b = new Date(trip.endDate).getTime();
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
      return Math.round((b - a) / 86_400_000) + 1;
    }
  }
  return trip.days.length;
}

export function countStops(trip: Trip): number {
  return trip.days.reduce((n, d) => n + d.stops.filter((s) => s.name.trim()).length, 0);
}
