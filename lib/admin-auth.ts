// Admin access = the user's CURRENT role in the DB is 'admin'. The role baked
// into the session cookie is intentionally NOT trusted here, so promoting or
// demoting a user takes effect on the next request without forcing a re-login.
import { supabaseAdmin } from "./supabase";
import { currentUserId } from "./user-auth";

export async function isAdmin(): Promise<boolean> {
  const id = currentUserId();
  if (!id) return false;
  try {
    const { data } = await supabaseAdmin()
      .from("app_users")
      .select("role")
      .eq("id", id)
      .maybeSingle();
    return data?.role === "admin";
  } catch {
    return false;
  }
}
