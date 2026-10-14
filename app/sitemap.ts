import type { MetadataRoute } from "next";
import { getTools } from "@/lib/tools";
import { isToolVisible } from "@/lib/tools-shared";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://formatbox.site").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const tools = (await getTools()).filter((t) => isToolVisible(t, "guest"));

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...tools.map((t) => ({
      url: `${SITE_URL}${t.href}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
