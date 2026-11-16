export function errMessage(e: unknown, fallback = "Lỗi"): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e || fallback;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

export function errName(e: unknown): string | undefined {
  if (e instanceof Error) return e.name;
  if (e && typeof e === "object" && "name" in e) {
    const n = (e as { name?: unknown }).name;
    if (typeof n === "string") return n;
  }
  return undefined;
}
