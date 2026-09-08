import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import { ADMIN_COOKIE, ADMIN_MAX_AGE } from "./admin-auth-edge";

export { ADMIN_COOKIE, ADMIN_MAX_AGE };

function secret(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD not set");
  return pw;
}

export function makeAdminToken(): string {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_MAX_AGE;
  const sig = createHmac("sha256", secret()).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig) return false;
  if (Date.now() / 1000 > exp) return false;
  const expected = createHmac("sha256", secret()).update(String(exp)).digest("hex");
  return expected === sig;
}

export function isAdmin(): boolean {
  try {
    return verifyAdminToken(cookies().get(ADMIN_COOKIE)?.value);
  } catch {
    return false;
  }
}
