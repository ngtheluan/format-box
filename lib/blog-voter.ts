import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { currentUserId } from "./user-auth";

// A stable identity for "one vote per reader": the logged-in user id when
// present, otherwise a salted hash of the client IP so guests are deduped too
// without storing the raw address.
export function blogVoterId(): string {
  const uid = currentUserId();
  if (uid) return `u:${uid}`;

  let ip = "0.0.0.0";
  try {
    const h = headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0].trim() ||
      h.get("x-real-ip")?.trim() ||
      "0.0.0.0";
  } catch {}

  const salt = process.env.ADMIN_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY || "fb-blog";
  const hash = createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
  return `ip:${hash}`;
}
