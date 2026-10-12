// Edge-runtime safe verify for the user cookie. Mirrors makeUserToken in
// lib/user-auth.ts: payload is `${userId}.${role}.${exp}`, signed via HMAC-SHA256
// with ADMIN_PASSWORD as the secret.
export const USER_COOKIE = "fb-user-token";

export type UserRole = "user" | "admin";

export async function verifyUserTokenEdge(
  token: string | undefined,
  secret: string | undefined,
): Promise<{ userId: string; role: UserRole } | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, roleRaw, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!userId || !exp || !sig) return null;
  if (Date.now() / 1000 > exp) return null;
  const role: UserRole = roleRaw === "admin" ? "admin" : "user";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(`${userId}.${role}.${exp}`));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  if (hex !== sig) return null;
  return { userId, role };
}
