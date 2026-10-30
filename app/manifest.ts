import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FormatBox",
    short_name: "FormatBox",
    description:
      "Bộ công cụ online miễn phí cho lập trình viên: JSON, Base64, hình ảnh, tỷ giá, giá vàng, giá xăng.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b12",
    theme_color: "#6366f1",
    lang: "vi-VN",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
