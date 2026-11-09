export const dynamic = "force-static";

export function GET() {
  return Response.json({
    name: "FormatBox Admin",
    short_name: "FB Admin",
    description: "FormatBox Admin Panel.",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#0f1a2e",
    theme_color: "#f59e0b",
    lang: "vi-VN",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/admin/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  });
}
