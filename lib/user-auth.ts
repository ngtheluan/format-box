import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const USER_COOKIE = "fb-user-token";
export const USER_MAX_AGE = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_PASSWORD not set (used as HMAC secret)");
  return s;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function makeUserToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + USER_MAX_AGE;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyUserToken(token: string | undefined): { userId: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!userId || !exp || !sig) return null;
  if (Date.now() / 1000 > exp) return null;
  const expected = createHmac("sha256", secret()).update(`${userId}.${exp}`).digest("hex");
  if (expected !== sig) return null;
  return { userId };
}

export function currentUserId(): string | null {
  try {
    return verifyUserToken(cookies().get(USER_COOKIE)?.value)?.userId ?? null;
  } catch {
    return null;
  }
}
