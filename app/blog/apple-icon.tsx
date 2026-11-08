import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="180" height="180">
  <defs>
    <linearGradient id="tile" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" fill="url(#tile)"/>
  <path fill="#fff" fill-rule="evenodd" d="M12 5.5h8V8h-8V5.5ZM12.4 9.5h7.2l3.4 6.3L16 27.5 9 15.8l3.4-6.3ZM15.4 22.8V17.9a2.1 2.1 0 1 1 1.2 0v4.9h-1.2Z"/>
</svg>`;

export default function BlogAppleIcon() {
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(SVG).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <img src={dataUri} width={180} height={180} />
      </div>
    ),
    { ...size }
  );
}
