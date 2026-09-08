// Edge-runtime safe (no node:crypto). Used by middleware.
export const ADMIN_COOKIE = "fb_admin";
export const ADMIN_MAX_AGE = 60 * 60 * 24 * 7;

export async function verifyAdminTokenEdge(
  token: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  if (!token || !password) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig) return false;
  if (Date.now() / 1000 > exp) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(String(exp)));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex === sig;
}
