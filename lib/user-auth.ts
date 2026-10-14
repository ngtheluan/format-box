import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { authSecret } from "./user-auth-edge";

export const USER_COOKIE = "fb-user-token";
export const USER_MAX_AGE = 60 * 60 * 24 * 30;

export type UserRole = "user" | "admin";

function secret(): string {
  const s = authSecret();
  if (!s) throw new Error("AUTH_SECRET not set — required to sign session tokens");
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

export function makeUserToken(userId: string, role: UserRole = "user"): string {
  const exp = Math.floor(Date.now() / 1000) + USER_MAX_AGE;
  const payload = `${userId}.${role}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyUserToken(token: string | undefined): { userId: string; role: UserRole } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, roleRaw, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!userId || !exp || !sig) return null;
  if (Date.now() / 1000 > exp) return null;
  const role: UserRole = roleRaw === "admin" ? "admin" : "user";
  const expected = createHmac("sha256", secret()).update(`${userId}.${role}.${exp}`).digest("hex");
  if (expected !== sig) return null;
  return { userId, role };
}

export function currentUser(): { userId: string; role: UserRole } | null {
  try {
    return verifyUserToken(cookies().get(USER_COOKIE)?.value);
  } catch {
    return null;
  }
}

export function currentUserId(): string | null {
  return currentUser()?.userId ?? null;
}
