export type DecodedJwt = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: { header: string; payload: string; signature: string };
};

export function base64UrlDecode(input: string): string {
  const clean = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = clean.length % 4 === 0 ? "" : "=".repeat(4 - (clean.length % 4));
  const b64 = clean + pad;
  // atob then decode UTF-8
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split(".");
  if (parts.length !== 3) throw new Error("JWT phải có 3 phần (header.payload.signature)");
  const [rawH, rawP, rawS] = parts;
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(base64UrlDecode(rawH));
  } catch {
    throw new Error("Header không phải JSON hợp lệ");
  }
  try {
    payload = JSON.parse(base64UrlDecode(rawP));
  } catch {
    throw new Error("Payload không phải JSON hợp lệ");
  }
  return { header, payload, signature: rawS, raw: { header: rawH, payload: rawP, signature: rawS } };
}

const CLAIM_LABELS: Record<string, string> = {
  iss: "Issuer",
  sub: "Subject",
  aud: "Audience",
  exp: "Expires at",
  nbf: "Not before",
  iat: "Issued at",
  jti: "JWT ID",
  scope: "Scope",
  scp: "Scope",
  azp: "Authorized party",
  typ: "Token type",
  alg: "Algorithm",
  kid: "Key ID",
};

export function labelFor(key: string): string {
  return CLAIM_LABELS[key] ?? key;
}

const TIME_CLAIMS = new Set(["exp", "nbf", "iat", "auth_time", "updated_at"]);

export function isTimeClaim(key: string): boolean {
  return TIME_CLAIMS.has(key);
}

export function formatTimeClaim(value: unknown): string {
  if (typeof value !== "number") return String(value);
  const d = new Date(value * 1000);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
