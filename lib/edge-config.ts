import { get } from "@vercel/edge-config";

// Key under which the active tool hrefs are stored in Edge Config.
export const ACTIVE_TOOLS_KEY = "activeTools";

/**
 * Edge-safe read of the active tool hrefs. Returns null when Edge Config is not
 * configured (no EDGE_CONFIG connection string) or on any error, so callers can
 * fall back to their existing source.
 */
export async function getActiveToolHrefs(): Promise<string[] | null> {
  if (!process.env.EDGE_CONFIG) return null;
  try {
    const hrefs = await get<string[]>(ACTIVE_TOOLS_KEY);
    return Array.isArray(hrefs) ? hrefs : null;
  } catch {
    return null;
  }
}

/**
 * Write the active tool hrefs to Edge Config via the Vercel REST API. Runs on
 * the Node runtime (admin mutations only). No-ops silently when the write
 * credentials are missing — the site still works via the Supabase fallback.
 */
export async function syncActiveTools(hrefs: string[]): Promise<void> {
  const id = process.env.EDGE_CONFIG_ID;
  const token = process.env.VERCEL_API_TOKEN;
  if (!id || !token) return;

  const team = process.env.VERCEL_TEAM_ID;
  const url = `https://api.vercel.com/v1/edge-config/${id}/items${team ? `?teamId=${team}` : ""}`;

  try {
    await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ operation: "upsert", key: ACTIVE_TOOLS_KEY, value: hrefs }],
      }),
    });
  } catch {
    // best-effort — never block the admin action on an Edge Config sync failure
  }
}
