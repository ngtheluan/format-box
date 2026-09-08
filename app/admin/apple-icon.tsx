import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#451a03"/>
      <stop offset="100%" stop-color="#0b0b12"/>
    </linearGradient>
    <linearGradient id="atop" x1="90" y1="24" x2="90" y2="86" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <linearGradient id="aleft" x1="22" y1="60" x2="90" y2="164" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="aright" x1="158" y1="60" x2="90" y2="164" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
  </defs>
  <rect width="180" height="180" rx="42" fill="url(#bg)"/>
  <path d="M90 24 22 60v60l68 36 68-36V60L90 24Z" fill="#000" opacity=".35"/>
  <path d="M90 24 22 60l68 36 68-36L90 24Z" fill="url(#atop)"/>
  <path d="M22 60v60l68 36V96L22 60Z" fill="url(#aleft)"/>
  <path d="M158 60v60l-68 36V96l68-36Z" fill="url(#aright)"/>
  <path d="M90 24 22 60l68 36 68-36L90 24Z" fill="none" stroke="#fff" stroke-width="1.6" stroke-opacity=".45" stroke-linejoin="round"/>
  <path d="M22 60v60l68 36 68-36V60" fill="none" stroke="#fff" stroke-width="1.6" stroke-opacity=".25" stroke-linejoin="round"/>
  <path d="M90 96v60" stroke="#fff" stroke-width="1.4" stroke-opacity=".25"/>
  <path d="m72 122 18 9 18-9" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M90 131v18" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
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
