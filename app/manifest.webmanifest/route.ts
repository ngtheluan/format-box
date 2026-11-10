export const dynamic = "force-static";

export function GET() {
  return new Response(
    JSON.stringify({
      name: "FormatBox",
      short_name: "FormatBox",
      description:
        "Bộ công cụ online miễn phí cho lập trình viên: JSON, Base64, hình ảnh, tỷ giá, giá vàng, giá xăng.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#0f1a2e",
      theme_color: "#2563eb",
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
