import { ImageResponse } from "next/og";
import { getPublicPost } from "@/lib/blog";

export const runtime = "nodejs";
export const alt = "FormatBox Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: { slug: string } }) {
  const post = await getPublicPost(params.slug);
  const title = post?.title ?? "FormatBox Blog";
  const label = post?.cover?.label ?? "FormatBox";
  const from = post?.cover?.from ?? "#4f46e5";
  const to = post?.cover?.to ?? "#9333ea";
  const category = post?.category?.toUpperCase() ?? "BLOG";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: 4, opacity: 0.9 }}>
          {category} · FORMATBOX BLOG
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.1,
            display: "flex",
            maxWidth: "100%",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, opacity: 0.95, textAlign: "right" }}>
          {label}
        </div>
      </div>
    ),
    { ...size },
  );
}
