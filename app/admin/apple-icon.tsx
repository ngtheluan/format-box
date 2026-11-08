import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="180" height="180">
  <defs>
    <linearGradient id="tile" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" fill="url(#tile)"/>
  <path fill="#fff" d="M9 9.5A1.5 1.5 0 0 1 10.5 8H23v4.5h-9.5v3H20V20h-6.5v4H9V9.5Z"/>
  <rect x="18.5" y="19" width="5" height="5" rx="1.2" fill="#fef3c7"/>
</svg>`;

export default function AdminAppleIcon() {
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
