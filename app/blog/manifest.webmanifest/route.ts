export const dynamic = "force-static";

export function GET() {
  return new Response(
    JSON.stringify({
      name: "FormatBox Blog",
      short_name: "FB Blog",
      description: "FormatBox Blog - Bài viết, mẹo và thủ thuật.",
      start_url: "/blog",
      scope: "/blog",
      display: "standalone",
      background_color: "#0f1a2e",
      theme_color: "#0d9488",
      lang: "vi-VN",
      icons: [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
      ],
    }),
    {
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate",
      },
    },
  );
}
