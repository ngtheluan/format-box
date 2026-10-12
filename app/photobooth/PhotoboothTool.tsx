"use client";

import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowLeft,
  IconCamera,
  IconCameraOff,
  IconCheck,
  IconDownload,
  IconFlipHorizontal,
  IconMoodSmile,
  IconPalette,
  IconPhotoFilled,
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconTypography,
  IconWand,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Step = "setup" | "capture" | "edit";
type EditTab = "filter" | "theme" | "sticker" | "text";

type FilterDef = { id: string; label: string; css: string };
type ThemeDef = {
  id: string;
  label: string;
  background: string;
  text: string;
  captionFont: string;
  defaultCaption: string;
  border?: string;
  decoration?: string; // SVG string overlay (full strip)
  shadow?: string;
};
type StickerDef = { id: string; label: string; svg: string };
type Placed = { id: string; stickerId: string; xPct: number; yPct: number; size: number; rot: number };

const FILTERS: FilterDef[] = [
  { id: "normal", label: "Original", css: "none" },
  { id: "bw", label: "B&W", css: "grayscale(1) contrast(1.08)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.25) brightness(0.95)" },
  { id: "sepia", label: "Sepia", css: "sepia(0.85) contrast(1.05)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.4) saturate(1.25) contrast(1.08) brightness(0.95)" },
  { id: "polaroid", label: "Polaroid", css: "sepia(0.2) saturate(1.1) contrast(1.05) brightness(1.03)" },
  { id: "kodak", label: "Kodak", css: "saturate(1.35) contrast(1.1) hue-rotate(-6deg) brightness(1.03)" },
  { id: "fuji", label: "Fuji", css: "saturate(1.15) contrast(1.08) hue-rotate(4deg) brightness(1.05)" },
  { id: "cool", label: "Cool", css: "saturate(1.1) hue-rotate(-14deg) brightness(1.05)" },
  { id: "warm", label: "Warm", css: "saturate(1.18) hue-rotate(12deg) brightness(1.06)" },
  { id: "sunset", label: "Sunset", css: "saturate(1.3) hue-rotate(20deg) brightness(1.08) contrast(1.05)" },
  { id: "dreamy", label: "Dreamy", css: "saturate(0.85) contrast(0.95) brightness(1.12)" },
  { id: "pastel", label: "Pastel", css: "saturate(0.75) contrast(0.9) brightness(1.1)" },
  { id: "bloom", label: "Bloom", css: "saturate(1.25) brightness(1.1) contrast(1.02)" },
  { id: "fade", label: "Fade", css: "saturate(0.8) contrast(0.85) brightness(1.08)" },
  { id: "matte", label: "Matte", css: "saturate(0.9) contrast(0.9) brightness(1.02)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.5) brightness(0.88)" },
  { id: "cinema", label: "Cinema", css: "saturate(1.1) contrast(1.25) brightness(0.95) hue-rotate(-4deg)" },
  { id: "lofi", label: "Lo-Fi", css: "saturate(1.3) contrast(1.3) brightness(0.92)" },
  { id: "neon", label: "Neon", css: "saturate(1.8) contrast(1.15) hue-rotate(-18deg) brightness(1.05)" },
];

// Full-strip decoration SVG patterns (viewBox fills). These sit behind photos.
const DECO_HEARTS = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 480 1100" preserveAspectRatio="xMidYMid slice"><g opacity="0.35" fill="#ff5c8a"><path d="M24 30c-2-6-10-6-12 0-2-6-10-6-12 0 0 7 12 14 12 14s12-7 12-14zM460 60c-2-6-10-6-12 0-2-6-10-6-12 0 0 7 12 14 12 14s12-7 12-14zM24 1060c-2-6-10-6-12 0-2-6-10-6-12 0 0 7 12 14 12 14s12-7 12-14zM460 1030c-2-6-10-6-12 0-2-6-10-6-12 0 0 7 12 14 12 14s12-7 12-14z"/></g></svg>`;

const DECO_STARS = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 480 1100" preserveAspectRatio="none"><g fill="#ffffff" opacity="0.75"><circle cx="30" cy="60" r="1.5"/><circle cx="80" cy="140" r="1"/><circle cx="440" cy="90" r="2"/><circle cx="400" cy="220" r="1.3"/><circle cx="60" cy="300" r="1.1"/><circle cx="430" cy="380" r="1.6"/><circle cx="30" cy="500" r="1"/><circle cx="450" cy="580" r="2"/><circle cx="80" cy="700" r="1.4"/><circle cx="420" cy="820" r="1.1"/><circle cx="40" cy="940" r="1.7"/><circle cx="440" cy="1020" r="1.3"/></g></svg>`;

const DECO_FILM = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 480 1100" preserveAspectRatio="none"><g fill="#2a2a2a">${Array.from({ length: 24 }, (_, i) => `<rect x="6" y="${30 + i * 44}" width="12" height="22" rx="2"/><rect x="462" y="${30 + i * 44}" width="12" height="22" rx="2"/>`).join("")}</g></svg>`;

const DECO_CONFETTI = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 480 1100" preserveAspectRatio="none"><g><circle cx="40" cy="80" r="4" fill="#ff6b9d"/><rect x="430" y="110" width="7" height="7" fill="#4ecdc4" transform="rotate(20 433 113)"/><circle cx="50" cy="520" r="3" fill="#ffd93d"/><rect x="440" y="420" width="6" height="6" fill="#9b5de5" transform="rotate(45 443 423)"/><circle cx="35" cy="860" r="3.5" fill="#4ecdc4"/><rect x="420" y="920" width="7" height="7" fill="#ff6b9d" transform="rotate(10 423 923)"/><circle cx="60" cy="300" r="2.5" fill="#9b5de5"/><circle cx="440" cy="760" r="2.5" fill="#ffd93d"/></g></svg>`;

const DECO_SAKURA = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 480 1100" preserveAspectRatio="none"><g fill="#ffb3d1" opacity="0.9"><g transform="translate(10 10) scale(0.6)"><circle cx="0" cy="0" r="8"/><circle cx="12" cy="0" r="8"/><circle cx="6" cy="10" r="8"/><circle cx="-6" cy="10" r="8"/><circle cx="6" cy="-10" r="8"/><circle cx="6" cy="4" r="3" fill="#ff80ab"/></g><g transform="translate(445 25) scale(0.5) rotate(30)"><circle cx="0" cy="0" r="8"/><circle cx="12" cy="0" r="8"/><circle cx="6" cy="10" r="8"/><circle cx="-6" cy="10" r="8"/><circle cx="6" cy="-10" r="8"/><circle cx="6" cy="4" r="3" fill="#ff80ab"/></g><g transform="translate(15 1055) scale(0.45) rotate(-10)"><circle cx="0" cy="0" r="8"/><circle cx="12" cy="0" r="8"/><circle cx="6" cy="10" r="8"/><circle cx="-6" cy="10" r="8"/><circle cx="6" cy="-10" r="8"/><circle cx="6" cy="4" r="3" fill="#ff80ab"/></g><g transform="translate(430 1070) scale(0.55) rotate(50)"><circle cx="0" cy="0" r="8"/><circle cx="12" cy="0" r="8"/><circle cx="6" cy="10" r="8"/><circle cx="-6" cy="10" r="8"/><circle cx="6" cy="-10" r="8"/><circle cx="6" cy="4" r="3" fill="#ff80ab"/></g></g></svg>`;

const DECO_CHECKER = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 480 1100" preserveAspectRatio="none"><g fill="#000" opacity="0.1">${Array.from({ length: 55 }, (_, r) => Array.from({ length: 24 }, (_, c) => ((r + c) % 2 === 0 ? `<rect x="${c * 20}" y="${r * 20}" width="20" height="20"/>` : "")).join("")).join("")}</g></svg>`;

const THEMES: ThemeDef[] = [
  {
    id: "classic",
    label: "Classic",
    background: "#111111",
    text: "#ffffff",
    captionFont: "'Playfair Display', Georgia, serif",
    defaultCaption: "Photobooth",
    shadow: "0 20px 50px -15px rgba(0,0,0,0.6)",
  },
  {
    id: "pastel",
    label: "Pastel",
    background: "linear-gradient(180deg, #ffd6e7 0%, #ffe8f1 100%)",
    text: "#5a1e3a",
    captionFont: "'Caveat', 'Comic Sans MS', cursive",
    defaultCaption: "with love",
    decoration: DECO_HEARTS,
  },
  {
    id: "polaroid",
    label: "Polaroid",
    background: "#fafafa",
    text: "#1a1a1a",
    captionFont: "'Caveat', 'Comic Sans MS', cursive",
    defaultCaption: "Memories",
    border: "#e0e0e0",
    shadow: "0 25px 50px -15px rgba(0,0,0,0.3)",
  },
  {
    id: "film",
    label: "Film Strip",
    background: "#0a0a0a",
    text: "#f0e9d2",
    captionFont: "'Courier New', monospace",
    defaultCaption: "KODAK 400",
    decoration: DECO_FILM,
  },
  {
    id: "y2k",
    label: "Y2K",
    background: "linear-gradient(180deg,#ff6ad5 0%,#c774e8 25%,#ad8cff 50%,#8795e8 75%,#94d0ff 100%)",
    text: "#ffffff",
    captionFont: "'Pacifico', 'Brush Script MT', cursive",
    defaultCaption: "iconic ✦",
    shadow: "0 20px 60px -10px rgba(199, 116, 232, 0.6)",
  },
  {
    id: "galaxy",
    label: "Galaxy",
    background: "linear-gradient(180deg,#0f0c29 0%,#302b63 50%,#24243e 100%)",
    text: "#f0eaff",
    captionFont: "'Playfair Display', Georgia, serif",
    defaultCaption: "stardust",
    decoration: DECO_STARS,
    shadow: "0 20px 60px -10px rgba(48, 43, 99, 0.6)",
  },
  {
    id: "sakura",
    label: "Sakura",
    background: "linear-gradient(180deg,#fff0f5 0%,#ffd6e0 100%)",
    text: "#8a1b4b",
    captionFont: "'Caveat', 'Comic Sans MS', cursive",
    defaultCaption: "spring vibes",
    decoration: DECO_SAKURA,
  },
  {
    id: "kraft",
    label: "Kraft",
    background: "#d4b483",
    text: "#2a1a08",
    captionFont: "'Courier New', monospace",
    defaultCaption: "good times",
    border: "#a07a3f",
  },
  {
    id: "noir",
    label: "Noir",
    background: "#0a0a0a",
    text: "#e8e8e8",
    captionFont: "'Playfair Display', Georgia, serif",
    defaultCaption: "noir",
    border: "#3a3a3a",
    shadow: "0 25px 60px -15px rgba(0,0,0,0.9)",
  },
  {
    id: "mint",
    label: "Mint",
    background: "linear-gradient(180deg,#c3f0ca 0%,#e0f7e9 100%)",
    text: "#1a4a2e",
    captionFont: "'Caveat', 'Comic Sans MS', cursive",
    defaultCaption: "fresh",
  },
  {
    id: "sunset",
    label: "Sunset",
    background: "linear-gradient(180deg,#ff9966 0%,#ff5e62 50%,#c850c0 100%)",
    text: "#ffffff",
    captionFont: "'Pacifico', 'Brush Script MT', cursive",
    defaultCaption: "golden hour",
    shadow: "0 20px 60px -10px rgba(255, 94, 98, 0.5)",
  },
  {
    id: "ocean",
    label: "Ocean",
    background: "linear-gradient(180deg,#2b5876 0%,#4e4376 100%)",
    text: "#e0f0ff",
    captionFont: "'Playfair Display', Georgia, serif",
    defaultCaption: "deep blue",
  },
  {
    id: "confetti",
    label: "Confetti",
    background: "#ffffff",
    text: "#333",
    captionFont: "'Pacifico', 'Brush Script MT', cursive",
    defaultCaption: "party!",
    border: "#eee",
    decoration: DECO_CONFETTI,
  },
  {
    id: "memphis",
    label: "Memphis",
    background: "#f4e8c1",
    text: "#1a1a1a",
    captionFont: "'Courier New', monospace",
    defaultCaption: "retro",
    decoration: DECO_CHECKER,
  },
  {
    id: "lavender",
    label: "Lavender",
    background: "linear-gradient(180deg,#dcd3f0 0%,#f3e8ff 100%)",
    text: "#4a2a6a",
    captionFont: "'Caveat', 'Comic Sans MS', cursive",
    defaultCaption: "soft",
  },
  {
    id: "neon",
    label: "Neon",
    background: "#0d0221",
    text: "#ff00f5",
    captionFont: "'Courier New', monospace",
    defaultCaption: "CYBER_PUNK",
    border: "#ff00f5",
    shadow: "0 0 60px rgba(255, 0, 245, 0.4), 0 20px 60px -10px rgba(0,0,0,0.8)",
  },
];

const STICKERS: StickerDef[] = [
  {
    id: "heart",
    label: "heart",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff4d6d" stroke="#8a1537" stroke-width="1.4" stroke-linejoin="round"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/></svg>`,
  },
  {
    id: "heart-pink",
    label: "pink heart",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffb3d1" stroke="#ff6b9d" stroke-width="1.3" stroke-linejoin="round"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/></svg>`,
  },
  {
    id: "star",
    label: "star",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffd43b" stroke="#8a6a00" stroke-width="1.4" stroke-linejoin="round"><path d="M12 3l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.9 6.2 20.95l1.1-6.5-4.7-4.6 6.5-.95z"/></svg>`,
  },
  {
    id: "sparkle",
    label: "sparkle",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" stroke="#9b5de5" stroke-width="1.3" stroke-linejoin="round"><path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z"/><circle cx="19" cy="4" r="1.3" fill="#9b5de5" stroke="none"/><circle cx="5" cy="19" r="1.1" fill="#9b5de5" stroke="none"/></svg>`,
  },
  {
    id: "sparkles",
    label: "sparkles",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="#ffd700" stroke="#b38600" stroke-width="0.8"><path d="M6 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/><path d="M18 10l1.3 3.6L23 15l-3.7 1.4L18 20l-1.3-3.6L13 15l3.7-1.4z"/><path d="M8 15l0.8 2.2L11 18l-2.2 0.8L8 21l-0.8-2.2L5 18l2.2-0.8z"/></g></svg>`,
  },
  {
    id: "crown",
    label: "crown",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffb703" stroke="#5a3a00" stroke-width="1.4" stroke-linejoin="round"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><circle cx="3" cy="8" r="1.3" fill="#ff4d6d" stroke="none"/><circle cx="21" cy="8" r="1.3" fill="#ff4d6d" stroke="none"/><circle cx="12" cy="5" r="1.3" fill="#ff4d6d" stroke="none"/></svg>`,
  },
  {
    id: "bow",
    label: "bow",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff80ab" stroke="#8a0e3f" stroke-width="1.3" stroke-linejoin="round"><path d="M12 12l-6-4v8zM12 12l6-4v8zM10 10h4v4h-4z"/></svg>`,
  },
  {
    id: "flower",
    label: "flower",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="#4a2458" stroke-width="1.2"><g fill="#ff85c1"><circle cx="12" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/></g><circle cx="12" cy="12" r="2.4" fill="#ffd43b"/></svg>`,
  },
  {
    id: "daisy",
    label: "daisy",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="#ffffff" stroke="#333" stroke-width="0.8"><ellipse cx="12" cy="5" rx="2" ry="4"/><ellipse cx="12" cy="19" rx="2" ry="4"/><ellipse cx="5" cy="12" rx="4" ry="2"/><ellipse cx="19" cy="12" rx="4" ry="2"/><ellipse cx="7" cy="7" rx="2" ry="3.5" transform="rotate(-45 7 7)"/><ellipse cx="17" cy="7" rx="2" ry="3.5" transform="rotate(45 17 7)"/><ellipse cx="7" cy="17" rx="2" ry="3.5" transform="rotate(45 7 17)"/><ellipse cx="17" cy="17" rx="2" ry="3.5" transform="rotate(-45 17 17)"/></g><circle cx="12" cy="12" r="3" fill="#ffd700"/></svg>`,
  },
  {
    id: "cloud",
    label: "cloud",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" stroke="#4b6bfb" stroke-width="1.4" stroke-linejoin="round"><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A4 4 0 0 1 17 18z"/></svg>`,
  },
  {
    id: "bolt",
    label: "bolt",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffd60a" stroke="#8a6a00" stroke-width="1.4" stroke-linejoin="round"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>`,
  },
  {
    id: "fire",
    label: "fire",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff6b35" stroke="#8a2a00" stroke-width="1.3" stroke-linejoin="round"><path d="M12 3c0 5-5 6-5 11a5 5 0 0 0 10 0c0-3-2-5-2-7 0 0-3 2-3-4z"/><path d="M12 20a3 3 0 0 1-3-3c0-2 3-3 3-6 0 2 3 4 3 6a3 3 0 0 1-3 3z" fill="#ffd60a" stroke="none"/></svg>`,
  },
  {
    id: "rainbow",
    label: "rainbow",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M3 18a9 9 0 0 1 18 0" stroke="#ff4d6d"/><path d="M5.5 18a6.5 6.5 0 0 1 13 0" stroke="#ff9500"/><path d="M8 18a4 4 0 0 1 8 0" stroke="#ffd60a"/><path d="M10 18a2 2 0 0 1 4 0" stroke="#34c759"/></svg>`,
  },
  {
    id: "cherry",
    label: "cherry",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 4 Q14 8 16 8 Q18 8 18 10" fill="none" stroke="#2e7d32" stroke-width="1.4" stroke-linecap="round"/><path d="M12 4 Q10 8 8 8 Q6 8 6 10" fill="none" stroke="#2e7d32" stroke-width="1.4" stroke-linecap="round"/><circle cx="7" cy="16" r="4.5" fill="#e53935" stroke="#8a0e13" stroke-width="1"/><circle cx="17" cy="16" r="4.5" fill="#e53935" stroke="#8a0e13" stroke-width="1"/><circle cx="5.5" cy="14.5" r="1" fill="#ffb3b3"/><circle cx="15.5" cy="14.5" r="1" fill="#ffb3b3"/></svg>`,
  },
  {
    id: "moon",
    label: "moon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f0e68c" stroke="#8a6a00" stroke-width="1.3" stroke-linejoin="round"><path d="M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10z"/></svg>`,
  },
  {
    id: "sun",
    label: "sun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffb703" stroke="#8a6a00" stroke-width="1.3" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><g stroke-width="1.6"><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="7" y2="7"/><line x1="17" y1="17" x2="19" y2="19"/><line x1="19" y1="5" x2="17" y2="7"/><line x1="5" y1="19" x2="7" y2="17"/></g></svg>`,
  },
  {
    id: "butterfly",
    label: "butterfly",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="#9b5de5" stroke="#4a2458" stroke-width="1" stroke-linejoin="round"><path d="M12 12c-3-6-9-5-9-1 0 4 3 6 9 7z"/><path d="M12 12c3-6 9-5 9-1 0 4-3 6-9 7z"/><path d="M12 12c-2 4-6 5-7 3 0-2 3-4 7-4z"/><path d="M12 12c2 4 6 5 7 3 0-2-3-4-7-4z"/></g><line x1="12" y1="7" x2="12" y2="19" stroke="#2a0a3f" stroke-width="1.4"/><circle cx="11" cy="7" r="0.8" fill="#2a0a3f"/><circle cx="13" cy="7" r="0.8" fill="#2a0a3f"/></svg>`,
  },
  {
    id: "sunglasses",
    label: "sunglasses",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#111" stroke="#111" stroke-width="1.2" stroke-linejoin="round"><path d="M2 9h8l-1 6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM14 9h8l-1 6a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM10 10h4"/></svg>`,
  },
  {
    id: "speech",
    label: "speech",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"><path d="M4 5h16v11H9l-4 4v-4H4z"/><circle cx="9" cy="10.5" r="1" fill="#111" stroke="none"/><circle cx="12" cy="10.5" r="1" fill="#111" stroke="none"/><circle cx="15" cy="10.5" r="1" fill="#111" stroke="none"/></svg>`,
  },
  {
    id: "note",
    label: "music note",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4b6bfb" stroke="#1a2a8a" stroke-width="1.2"><path d="M9 18V5l11-2v13" fill="none" stroke-width="1.6"/><ellipse cx="7" cy="18" rx="3" ry="2.5"/><ellipse cx="18" cy="16" rx="3" ry="2.5"/></svg>`,
  },
  {
    id: "cat",
    label: "cat ears",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1a1a1a" stroke-linejoin="round" stroke="#000"><path d="M3 20L7 6l5 6"/><path d="M21 20L17 6l-5 6"/><path d="M6 10l1 2 2-1" fill="#ff85c1" stroke="none"/><path d="M18 10l-1 2-2-1" fill="#ff85c1" stroke="none"/></svg>`,
  },
  {
    id: "lips",
    label: "lips",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#e53935" stroke="#8a0e13" stroke-width="1" stroke-linejoin="round"><path d="M2 12 Q6 7 9 11 Q12 8 15 11 Q18 7 22 12 Q18 17 15 15 Q12 17 9 15 Q6 17 2 12z"/><path d="M2 12 Q12 10 22 12 Q12 13 2 12z" fill="#8a0e13" stroke="none"/></svg>`,
  },
  {
    id: "glasses",
    label: "glasses",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.6" stroke-linejoin="round"><circle cx="6" cy="13" r="4" fill="#ffd6e7"/><circle cx="18" cy="13" r="4" fill="#ffd6e7"/><line x1="10" y1="13" x2="14" y2="13"/><path d="M2 10 L4 10"/><path d="M22 10 L20 10"/></svg>`,
  },
];

// --- Text label stickers (words rendered as SVG so canvas can draw them) ---
const TEXT_STICKERS = ["cute", "besties", "iconic", "mood", "vibes", "slay", "forever", "pretty"];
function textStickerSvg(text: string, color = "#ff4d6d", stroke = "#ffffff") {
  const w = Math.max(80, text.length * 32);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 60"><text x="${w / 2}" y="44" text-anchor="middle" font-family="'Pacifico','Brush Script MT',cursive" font-size="48" font-weight="700" fill="${color}" stroke="${stroke}" stroke-width="4" paint-order="stroke fill">${text}</text></svg>`;
}
const TEXT_STICKERS_DEFS: StickerDef[] = TEXT_STICKERS.flatMap((t) => [
  { id: `txt-${t}-pink`, label: t, svg: textStickerSvg(t, "#ff4d6d", "#ffffff") },
  { id: `txt-${t}-black`, label: t, svg: textStickerSvg(t, "#111", "#ffffff") },
]);

const ALL_STICKERS = [...STICKERS, ...TEXT_STICKERS_DEFS];

// Strip dimensions in CSS px (also used as canvas px on export).
const STRIP_W = 480;
const PHOTO_W = 440;
const PHOTO_H = 330;
const PHOTO_GAP = 12;
const STRIP_PAD = 20;
const CAPTION_H = 68;
const SHOT_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

function stripHeight(shots: number) {
  return STRIP_PAD + shots * PHOTO_H + (shots - 1) * PHOTO_GAP + CAPTION_H + STRIP_PAD;
}

function svgToDataURL(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function todayString() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

async function waitForVideo(v: HTMLVideoElement, timeoutMs = 4000): Promise<void> {
  if (v.readyState >= 2 && v.videoWidth > 0) return;
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      v.removeEventListener("loadeddata", finish);
      v.removeEventListener("playing", finish);
      resolve();
    };
    v.addEventListener("loadeddata", finish);
    v.addEventListener("playing", finish);
    setTimeout(finish, timeoutMs);
  });
}

export default function PhotoboothTool() {
  const { t } = useI18n();

  const [step, setStep] = useState<Step>("setup");
  const [shots, setShots] = useState(4);
  const [timer, setTimer] = useState(3);
  const [mirror, setMirror] = useState(true);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [captures, setCaptures] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const capturingRef = useRef(false);

  const [filterId, setFilterId] = useState<string>("polaroid");
  const [themeId, setThemeId] = useState<string>("pastel");
  const [caption, setCaption] = useState<string>("");
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<EditTab>("filter");

  const stripRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  // Dragging from the palette (sticker/text picker) → drop onto strip
  const paletteDragRef = useRef<{ stickerId: string; isText: boolean; sx: number; sy: number; moved: boolean } | null>(null);
  const [ghost, setGhost] = useState<{ stickerId: string; x: number; y: number; isText: boolean } | null>(null);
  const [dropHot, setDropHot] = useState(false);

  const filter = useMemo(() => FILTERS.find((f) => f.id === filterId) ?? FILTERS[0], [filterId]);
  const theme = useMemo(() => THEMES.find((th) => th.id === themeId) ?? THEMES[0], [themeId]);

  const cameraReady = !!stream;

  // Attach stream to video element whenever either changes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (stream && v.srcObject !== stream) {
      v.srcObject = stream;
    } else if (!stream) {
      v.srcObject = null;
    }
    if (stream) {
      v.play().catch(() => {});
    }
  }, [stream, step]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      setStream(s);
    } catch (e) {
      setStream(null);
      setCameraError(e instanceof Error ? e.message : "camera error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((tr) => tr.stop());
    setStream(null);
  }, [stream]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grabFrame = useCallback(async (): Promise<string | null> => {
    const v = videoRef.current;
    if (!v) return null;
    // Wait until the video reports it HAS a decoded frame (HAVE_CURRENT_DATA = 2 or above).
    for (let attempt = 0; attempt < 30; attempt++) {
      if (v.videoWidth > 0 && v.readyState >= 2 && !v.paused) break;
      await new Promise((r) => setTimeout(r, 80));
    }
    if (!v.videoWidth) return null;

    // Retry the actual grab a few times: validate the drawn pixels aren't 0/transparent.
    for (let tries = 0; tries < 5; tries++) {
      const srcW = v.videoWidth;
      const srcH = v.videoHeight;
      const targetRatio = PHOTO_W / PHOTO_H;
      let cropW = srcW;
      let cropH = srcW / targetRatio;
      if (cropH > srcH) {
        cropH = srcH;
        cropW = srcH * targetRatio;
      }
      const sx = (srcW - cropW) / 2;
      const sy = (srcH - cropH) / 2;
      const c = document.createElement("canvas");
      c.width = PHOTO_W * 2;
      c.height = PHOTO_H * 2;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      if (mirror) {
        ctx.translate(c.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, sx, sy, cropW, cropH, 0, 0, c.width, c.height);
      // Sanity-check: sample a few pixels; if all are transparent/pure-black, the frame is blank.
      const samples = [
        ctx.getImageData(c.width / 2, c.height / 2, 1, 1).data,
        ctx.getImageData(10, 10, 1, 1).data,
        ctx.getImageData(c.width - 10, c.height - 10, 1, 1).data,
      ];
      const hasPixels = samples.some((s) => s[3] > 0 && (s[0] + s[1] + s[2]) > 0);
      if (hasPixels) return c.toDataURL("image/jpeg", 0.92);
      await new Promise((r) => setTimeout(r, 120));
    }
    return null;
  }, [mirror]);

  const runCaptureSequence = useCallback(async () => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    setCaptures([]);
    const taken: string[] = [];

    // Make sure video has frames.
    const v = videoRef.current;
    if (v) await waitForVideo(v);

    for (let i = 0; i < shots; i++) {
      if (timer > 0) {
        for (let s = timer; s > 0; s--) {
          setCountdown(s);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      setCountdown(null);
      setFlashKey((k) => k + 1);
      const frame = await grabFrame();
      if (frame) {
        taken.push(frame);
        setCaptures([...taken]);
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    capturingRef.current = false;
    setStep("edit");
    stopCamera();
  }, [shots, timer, grabFrame, stopCamera]);

  const beginCapture = useCallback(async () => {
    if (!stream) {
      await startCamera();
    }
    setStep("capture");
  }, [stream, startCamera]);

  // Kick off the sequence when entering the capture step (ensures video is mounted).
  useEffect(() => {
    if (step !== "capture") return;
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;
    (async () => {
      await waitForVideo(v);
      // extra buffer so the first frame is actually painted before we grab
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;
      runCaptureSequence();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const backToSetup = useCallback(async () => {
    capturingRef.current = false;
    setCaptures([]);
    setCountdown(null);
    setStep("setup");
    if (!stream) await startCamera();
  }, [stream, startCamera]);

  const resetAll = useCallback(() => {
    setCaptures([]);
    setPlaced([]);
    setSelectedId(null);
    setCaption("");
    setStep("setup");
  }, []);

  // --- Sticker drag (window-level listeners for robustness) ---
  useEffect(() => {
    const isOverStrip = (x: number, y: number) => {
      const stripEl = stripRef.current;
      if (!stripEl) return null;
      const r = stripEl.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
      return r;
    };
    const onMove = (e: PointerEvent) => {
      // 1) Dragging from palette → promote to drag once movement passes threshold
      const pd = paletteDragRef.current;
      if (pd) {
        const dx = e.clientX - pd.sx;
        const dy = e.clientY - pd.sy;
        if (!pd.moved && dx * dx + dy * dy > 25) pd.moved = true;
        if (pd.moved) {
          setGhost({ stickerId: pd.stickerId, isText: pd.isText, x: e.clientX, y: e.clientY });
          setDropHot(!!isOverStrip(e.clientX, e.clientY));
        }
        return;
      }
      // 2) Moving an already-placed sticker
      const st = dragStateRef.current;
      const stripEl = stripRef.current;
      if (!st || !stripEl) return;
      const rect = stripEl.getBoundingClientRect();
      const x = e.clientX - rect.left - st.dx;
      const y = e.clientY - rect.top - st.dy;
      const xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, (y / rect.height) * 100));
      setPlaced((cur) => cur.map((p) => (p.id === st.id ? { ...p, xPct, yPct } : p)));
    };
    const addPlaced = (stickerId: string, xPct: number | null, yPct: number | null) => {
      const isText = stickerId.startsWith("txt-");
      const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setPlaced((cur) => {
        const fx = xPct ?? 50;
        const fy = yPct ?? 20 + (cur.length % 6) * 10;
        return [...cur, { id, stickerId, xPct: fx, yPct: fy, size: isText ? 140 : 72, rot: isText ? -6 : 0 }];
      });
      setSelectedId(id);
    };
    const onUp = (e: PointerEvent) => {
      const pd = paletteDragRef.current;
      if (pd) {
        if (pd.moved) {
          const r = isOverStrip(e.clientX, e.clientY);
          if (r) {
            const xPct = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
            const yPct = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
            addPlaced(pd.stickerId, xPct, yPct);
          }
          // dragged but not released over strip → cancelled, nothing to do
        } else {
          // No movement — treat as a tap/click: add at default position
          addPlaced(pd.stickerId, null, null);
        }
        paletteDragRef.current = null;
        setGhost(null);
        setDropHot(false);
      }
      dragStateRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const startPaletteDrag = (e: React.PointerEvent, stickerId: string) => {
    e.preventDefault();
    const isText = stickerId.startsWith("txt-");
    paletteDragRef.current = { stickerId, isText, sx: e.clientX, sy: e.clientY, moved: false };
  };

  const onPointerDownSticker = (e: React.PointerEvent, p: Placed) => {
    e.stopPropagation();
    e.preventDefault();
    const stripEl = stripRef.current;
    if (!stripEl) return;
    const rect = stripEl.getBoundingClientRect();
    const px = (p.xPct / 100) * rect.width;
    const py = (p.yPct / 100) * rect.height;
    dragStateRef.current = { id: p.id, dx: e.clientX - (rect.left + px), dy: e.clientY - (rect.top + py) };
    setSelectedId(p.id);
  };

  const addSticker = (stickerId: string) => {
    const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const isText = stickerId.startsWith("txt-");
    setPlaced((cur) => [
      ...cur,
      {
        id,
        stickerId,
        xPct: 50,
        yPct: 20 + (cur.length % 6) * 10,
        size: isText ? 140 : 72,
        rot: isText ? -6 : 0,
      },
    ]);
    setSelectedId(id);
  };
  const removeSelected = () => {
    if (!selectedId) return;
    setPlaced((cur) => cur.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  };
  const clearStickers = () => {
    setPlaced([]);
    setSelectedId(null);
  };

  const resizeSelected = (delta: number) => {
    if (!selectedId) return;
    setPlaced((cur) =>
      cur.map((p) => (p.id === selectedId ? { ...p, size: Math.max(24, Math.min(260, p.size + delta)) } : p)),
    );
  };
  const rotateSelected = (delta: number) => {
    if (!selectedId) return;
    setPlaced((cur) => cur.map((p) => (p.id === selectedId ? { ...p, rot: p.rot + delta } : p)));
  };

  // --- Export ---
  const [exporting, setExporting] = useState(false);
  const downloadPhoto = useCallback(async () => {
    if (!captures.length) return;
    setExporting(true);
    try {
      const scale = 2;
      const w = STRIP_W * scale;
      const h = stripHeight(captures.length) * scale;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background
      if (theme.background.startsWith("linear-gradient")) {
        const match = theme.background.match(/linear-gradient\(([^,]+),(.+)\)$/);
        const stops = match ? match[2].split(/,(?![^(]*\))/).map((c) => c.trim()) : ["#ffffff"];
        const g = ctx.createLinearGradient(0, 0, 0, h);
        stops.forEach((raw, i) => {
          const parts = raw.split(/\s+/);
          const color = parts[0];
          const posStr = parts.find((p) => p.endsWith("%"));
          const pos = posStr ? parseFloat(posStr) / 100 : i / Math.max(1, stops.length - 1);
          g.addColorStop(Math.max(0, Math.min(1, pos)), color);
        });
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = theme.background;
      }
      ctx.fillRect(0, 0, w, h);

      if (theme.border) {
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(1 * scale, 1 * scale, w - 2 * scale, h - 2 * scale);
      }

      // Photos
      const photoX = ((STRIP_W - PHOTO_W) / 2) * scale;
      for (let i = 0; i < captures.length; i++) {
        const img = await loadImage(captures[i]);
        const y = (STRIP_PAD + i * (PHOTO_H + PHOTO_GAP)) * scale;
        ctx.save();
        ctx.filter = filter.css;
        ctx.drawImage(img, photoX, y, PHOTO_W * scale, PHOTO_H * scale);
        ctx.restore();
      }

      // Caption
      ctx.filter = "none";
      ctx.fillStyle = theme.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const captionY = h - (STRIP_PAD + CAPTION_H / 2) * scale;
      const captionText = caption.trim() || theme.defaultCaption;
      ctx.font = `700 ${26 * scale}px ${theme.captionFont}`;
      ctx.fillText(captionText, w / 2, captionY - 8 * scale);
      ctx.font = `500 ${13 * scale}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto`;
      ctx.globalAlpha = 0.75;
      ctx.fillText(todayString(), w / 2, captionY + 20 * scale);
      ctx.globalAlpha = 1;

      // Stickers
      for (const p of placed) {
        const def = ALL_STICKERS.find((s) => s.id === p.stickerId);
        if (!def) continue;
        const img = await loadImage(svgToDataURL(def.svg));
        const sizePx = p.size * scale;
        const ratio = img.width && img.height ? img.width / img.height : 1;
        const wPx = sizePx;
        const hPx = sizePx / ratio;
        const cx = (p.xPct / 100) * w;
        const cy = (p.yPct / 100) * h;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.drawImage(img, -wPx / 2, -hPx / 2, wPx, hPx);
        ctx.restore();
      }

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `photobooth-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setExporting(false);
    }
  }, [captures, filter, theme, caption, placed]);

  // --- Render helpers for strip ---
  const renderStrip = (interactive: boolean) => (
    <div
      ref={interactive ? stripRef : null}
      className={`pb-strip ${interactive && dropHot ? "drop-hot" : ""}`}
      style={{
        width: STRIP_W,
        background: theme.background,
        color: theme.text,
        border: theme.border ? `1px solid ${theme.border}` : "none",
        boxShadow: theme.shadow ?? "0 20px 50px -15px rgba(0,0,0,0.35)",
      }}
      onClick={interactive ? () => setSelectedId(null) : undefined}
    >
      <div className="pb-strip-inner">
        {captures.filter(Boolean).map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`shot ${i + 1}`}
            className="pb-strip-photo"
            style={{
              aspectRatio: `${PHOTO_W} / ${PHOTO_H}`,
              filter: filter.css,
            }}
            draggable={false}
          />
        ))}
        <div className="pb-strip-caption">
          <div className="pb-caption-main" style={{ fontFamily: theme.captionFont }}>
            {caption.trim() || theme.defaultCaption}
          </div>
          <div className="pb-caption-date">{todayString()}</div>
        </div>
      </div>
      {placed.map((p) => {
        const def = ALL_STICKERS.find((s) => s.id === p.stickerId);
        if (!def) return null;
        const isSelected = selectedId === p.id;
        return (
          <div
            key={p.id}
            className={`pb-sticker ${isSelected ? "sel" : ""}`}
            style={{
              left: `${p.xPct}%`,
              top: `${p.yPct}%`,
              width: p.size,
              height: p.stickerId.startsWith("txt-") ? "auto" : p.size,
              transform: `translate(-50%,-50%) rotate(${p.rot}deg)`,
            }}
            onPointerDown={interactive ? (e) => onPointerDownSticker(e, p) : undefined}
            onClick={
              interactive
                ? (e) => {
                    e.stopPropagation();
                    setSelectedId(p.id);
                  }
                : undefined
            }
            dangerouslySetInnerHTML={{ __html: def.svg }}
          />
        );
      })}
    </div>
  );

  return (
    <div className="pb-wrap">
      {step === "setup" && (
        <div className="pb-grid-setup">
          <div className="pb-camera-card">
            <div className="pb-preview setup">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  transform: mirror ? "scaleX(-1)" : "none",
                  opacity: cameraReady ? 1 : 0,
                  pointerEvents: cameraReady ? "auto" : "none",
                }}
              />
              {!cameraReady && (
                <div className="pb-preview-empty">
                  <div className="pb-empty-glow" />
                  <div className="pb-empty-grid" />
                  <div className="pb-cam-ic">
                    {cameraError ? <IconCameraOff size={38} stroke={1.5} /> : <IconCamera size={38} stroke={1.5} />}
                    <span className="pb-cam-pulse" />
                  </div>
                  <h3 className="pb-empty-title">{cameraError ? t("pb_no_camera") : "Say cheese!"}</h3>
                  <p className="pb-empty-sub">{cameraError ? cameraError : t("pb_allow_camera")}</p>
                  <Button onClick={startCamera} size="lg">
                    <IconCamera size={16} stroke={1.8} />
                    {t("pb_start_camera")}
                  </Button>
                  <div className="pb-empty-sparkles">
                    <IconSparkles size={14} />
                    <span>HD · 4:3 · browser-only</span>
                    <IconSparkles size={14} />
                  </div>
                </div>
              )}
              {cameraReady && (
                <div className="pb-live-badge">
                  <span className="pb-live-dot" /> LIVE
                </div>
              )}
              {cameraReady && <div className="pb-cam-corner tl" />}
              {cameraReady && <div className="pb-cam-corner tr" />}
              {cameraReady && <div className="pb-cam-corner bl" />}
              {cameraReady && <div className="pb-cam-corner br" />}
            </div>

            <div className="pb-cta">
              <Button onClick={beginCapture} disabled={!cameraReady} block size="lg">
                <IconCamera size={18} stroke={1.8} />
                {cameraReady ? t("pb_capture") : "Bật camera để bắt đầu"}
              </Button>
            </div>
          </div>

          <div className="pb-side setup-side">
            <div className="pb-setup-hero">
              <div className="pb-setup-hero-ic">
                <IconSparkles size={16} stroke={1.8} />
              </div>
              <div>
                <div className="pb-setup-hero-title">Chuẩn bị bộ ảnh</div>
                <div className="pb-setup-hero-sub">Tùy chỉnh trước khi chụp</div>
              </div>
            </div>

            <div className="pb-section">
              <label className="pb-label">
                <IconPhotoFilled size={12} stroke={1.8} /> {t("pb_shots")}
              </label>
              <div className="pb-chip-grid-6">
                {SHOT_OPTIONS.map((n) => (
                  <button key={n} className={`pb-chip pill ${shots === n ? "on" : ""}`} onClick={() => setShots(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="pb-section">
              <label className="pb-label">
                <IconMoodSmile size={12} stroke={1.8} /> {t("pb_timer")}
              </label>
              <div className="pb-chip-row">
                {[0, 3, 5].map((n) => (
                  <button
                    key={n}
                    className={`pb-chip pill flex ${timer === n ? "on" : ""}`}
                    onClick={() => setTimer(n)}
                  >
                    {n === 0 ? "Tắt" : `${n} giây`}
                  </button>
                ))}
              </div>
            </div>

            <div className="pb-section">
              <label className="pb-label">
                <IconFlipHorizontal size={12} stroke={1.8} /> {t("pb_mirror")}
              </label>
              <div className="pb-toggle" role="switch" aria-checked={mirror} onClick={() => setMirror((m) => !m)}>
                <div className={`pb-toggle-thumb ${mirror ? "on" : ""}`} />
                <span className={`pb-toggle-label l ${!mirror ? "on" : ""}`}>OFF</span>
                <span className={`pb-toggle-label r ${mirror ? "on" : ""}`}>ON</span>
              </div>
            </div>

            <div className="pb-section">
              <label className="pb-label">Xem trước bộ ảnh</label>
              <div className="pb-mini-wrap">
                <div
                  className="pb-mini-strip"
                  style={{
                    // scale cell so total strip height stays compact regardless of shot count
                    ["--mini-cell-h" as string]: `${Math.max(14, Math.min(44, 150 / shots))}px`,
                  }}
                >
                  {Array.from({ length: shots }).map((_, i) => (
                    <div key={i} className="pb-mini-cell">
                      <div className="pb-mini-cell-ic">{i + 1}</div>
                    </div>
                  ))}
                  <div className="pb-mini-caption">photobooth · {todayString()}</div>
                </div>
                <div className="pb-mini-meta">
                  <span className="pb-mini-badge">{shots} ảnh</span>
                  <span className="pb-mini-meta-sub">tỉ lệ 4:3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "capture" && (
        <div className="pb-capture">
          <div className="pb-preview big">
            <video ref={videoRef} playsInline muted autoPlay style={{ transform: mirror ? "scaleX(-1)" : "none" }} />
            {countdown !== null && (
              <div className="pb-countdown">
                <span>{countdown}</span>
              </div>
            )}
            <div key={flashKey} className="pb-flash" />
            <div className="pb-progress">
              {captures.length} / {shots}
            </div>
          </div>
          <div className="pb-thumbs">
            {Array.from({ length: shots }).map((_, i) => (
              <div key={i} className={`pb-thumb ${captures[i] ? "done" : ""}`}>
                {captures[i] ? <img src={captures[i]} alt="" /> : <span>{i + 1}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "edit" && (
        <div className="pb-grid-edit">
          <div className="pb-strip-wrap">
            {renderStrip(true)}
            <p className="pb-hint">{t("pb_hint_drag")}</p>
          </div>

          <div className="pb-side wide edit-side">
            <div className="pb-edit-hero">
              <div className="pb-edit-hero-ic">
                <IconWand size={16} stroke={1.8} />
              </div>
              <div>
                <div className="pb-edit-hero-title">Trang trí bộ ảnh</div>
                <div className="pb-edit-hero-sub">Filter · Theme · Sticker · Caption</div>
              </div>
            </div>

            <div className="pb-tabs">
              <button className={`pb-tab ${editTab === "filter" ? "on" : ""}`} onClick={() => setEditTab("filter")}>
                <IconPhotoFilled size={14} stroke={1.8} />
                <span>{t("pb_filter")}</span>
                <span className="pb-tab-badge">{FILTERS.length}</span>
              </button>
              <button className={`pb-tab ${editTab === "theme" ? "on" : ""}`} onClick={() => setEditTab("theme")}>
                <IconPalette size={14} stroke={1.8} />
                <span>Theme</span>
                <span className="pb-tab-badge">{THEMES.length}</span>
              </button>
              <button className={`pb-tab ${editTab === "sticker" ? "on" : ""}`} onClick={() => setEditTab("sticker")}>
                <IconMoodSmile size={14} stroke={1.8} />
                <span>Sticker</span>
                <span className="pb-tab-badge">{STICKERS.length}</span>
              </button>
              <button className={`pb-tab ${editTab === "text" ? "on" : ""}`} onClick={() => setEditTab("text")}>
                <IconTypography size={14} stroke={1.8} />
                <span>Text</span>
              </button>
            </div>

            {editTab === "filter" && (
              <div className="pb-filter-grid">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    className={`pb-filter ${filterId === f.id ? "on" : ""}`}
                    onClick={() => setFilterId(f.id)}
                  >
                    <div className="pb-filter-img-wrap">
                      {captures[0] ? (
                        <img src={captures[0]} alt="" style={{ filter: f.css }} />
                      ) : (
                        <div className="pb-filter-ph" style={{ filter: f.css }} />
                      )}
                      {filterId === f.id && (
                        <div className="pb-filter-check">
                          <IconCheck size={10} stroke={3} />
                        </div>
                      )}
                    </div>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            )}

            {editTab === "theme" && (
              <div className="pb-theme-grid">
                {THEMES.map((th, idx) => {
                  // vary tiny preview photo gradients for visual richness
                  const g1 = ["linear-gradient(135deg,#ffd1a1,#c9e8ff)", "linear-gradient(135deg,#ffb3d1,#ffd1a1)", "linear-gradient(135deg,#c9e8ff,#c3f0ca)", "linear-gradient(135deg,#f0d1ff,#ffd1a1)"][idx % 4];
                  const g2 = ["linear-gradient(135deg,#c9e8ff,#ffb3d1)", "linear-gradient(135deg,#c3f0ca,#ffd1a1)", "linear-gradient(135deg,#ffd1a1,#f0d1ff)", "linear-gradient(135deg,#ffb3d1,#c9e8ff)"][idx % 4];
                  return (
                  <button
                    key={th.id}
                    className={`pb-theme ${themeId === th.id ? "on" : ""}`}
                    onClick={() => setThemeId(th.id)}
                  >
                    <div
                      className="pb-theme-mini"
                      style={{
                        background: th.background,
                        border: th.border ? `1px solid ${th.border}` : "none",
                      }}
                    >
                      {th.decoration && (
                        <div className="pb-theme-mini-deco" dangerouslySetInnerHTML={{ __html: th.decoration }} />
                      )}
                      <div className="pb-theme-mini-inner">
                        <div className="pb-theme-mini-ph" style={{ background: g1 }} />
                        <div className="pb-theme-mini-ph" style={{ background: g2 }} />
                        <div
                          className="pb-theme-mini-cap"
                          style={{ color: th.text, fontFamily: th.captionFont }}
                        >
                          {th.label}
                        </div>
                      </div>
                    </div>
                    {themeId === th.id && (
                      <div className="pb-theme-check">
                        <IconCheck size={12} stroke={2.6} />
                      </div>
                    )}
                  </button>
                  );
                })}
              </div>
            )}

            {editTab === "sticker" && (
              <>
                <p className="pb-drag-hint">
                  <IconSparkles size={12} stroke={1.8} /> Click để thêm hoặc <b>kéo thả</b> vào vị trí mong muốn trên khung
                </p>
                <div className="pb-sticker-grid">
                  {STICKERS.map((s) => (
                    <button
                      key={s.id}
                      className="pb-sticker-btn"
                      onPointerDown={(e) => startPaletteDrag(e, s.id)}
                      title={s.label}
                      dangerouslySetInnerHTML={{ __html: s.svg }}
                    />
                  ))}
                </div>
                <div className="pb-ctrl-row">
                  <button className="pb-chip" onClick={() => resizeSelected(-12)} disabled={!selectedId}>
                    −
                  </button>
                  <button className="pb-chip" onClick={() => resizeSelected(12)} disabled={!selectedId}>
                    +
                  </button>
                  <button className="pb-chip" onClick={() => rotateSelected(-10)} disabled={!selectedId}>
                    ⟲
                  </button>
                  <button className="pb-chip" onClick={() => rotateSelected(10)} disabled={!selectedId}>
                    ⟳
                  </button>
                  <button className="pb-chip" onClick={removeSelected} disabled={!selectedId}>
                    <IconTrash size={14} stroke={1.8} />
                  </button>
                  <button className="pb-chip" onClick={clearStickers} disabled={!placed.length}>
                    {t("pb_clear_stickers")}
                  </button>
                </div>
              </>
            )}

            {editTab === "text" && (
              <>
                <div className="pb-section">
                  <label className="pb-label">{t("pb_caption")}</label>
                  <input
                    className="pb-input"
                    type="text"
                    value={caption}
                    maxLength={40}
                    placeholder={theme.defaultCaption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </div>
                <div className="pb-section">
                  <label className="pb-label">Word stickers</label>
                  <div className="pb-text-grid">
                    {TEXT_STICKERS_DEFS.map((s) => (
                      <button
                        key={s.id}
                        className="pb-text-btn"
                        onPointerDown={(e) => startPaletteDrag(e, s.id)}
                        dangerouslySetInnerHTML={{ __html: s.svg }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="pb-actions">
              <Button onClick={downloadPhoto} disabled={exporting} block size="lg">
                <IconDownload size={18} stroke={1.8} />
                {exporting ? "..." : t("pb_download")}
              </Button>
              <div className="pb-chip-row">
                <button className="pb-chip" onClick={backToSetup}>
                  <IconArrowLeft size={14} stroke={1.8} />
                  {t("pb_retake")}
                </button>
                <button className="pb-chip" onClick={resetAll}>
                  <IconRefresh size={14} stroke={1.8} />
                  {t("pb_new_session")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ghost && (() => {
        const def = ALL_STICKERS.find((s) => s.id === ghost.stickerId);
        if (!def) return null;
        return (
          <div
            className="pb-ghost"
            style={{
              left: ghost.x,
              top: ghost.y,
              width: ghost.isText ? 160 : 72,
              height: ghost.isText ? "auto" : 72,
            }}
            dangerouslySetInnerHTML={{ __html: def.svg }}
          />
        );
      })()}

      <style jsx>{`
        .pb-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pb-grid-setup {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(300px, 400px);
          gap: 16px;
          align-items: stretch;
        }
        @media (max-width: 820px) {
          .pb-grid-setup {
            grid-template-columns: 1fr;
          }
        }
        .pb-camera-card {
          position: relative;
          background: linear-gradient(145deg, rgba(155, 93, 229, 0.1), rgba(76, 201, 240, 0.05));
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 12px;
          box-shadow: 0 10px 40px -20px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
        }
        .pb-camera-card::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 20px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(155, 93, 229, 0.4), transparent 40%, rgba(76, 201, 240, 0.3));
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .pb-preview {
          position: relative;
          aspect-ratio: 4 / 3;
          background: #0a0a0a;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
        }
        .pb-preview.setup {
          max-height: 540px;
        }
        .pb-preview.big {
          max-width: 760px;
          margin: 0 auto;
          border-radius: 14px;
          box-shadow: 0 20px 50px -15px rgba(0, 0, 0, 0.4);
        }
        .pb-preview video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.3s;
        }
        .pb-preview-empty {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 24px;
          text-align: center;
          color: #e8e8e8;
          background: radial-gradient(ellipse at 50% 45%, #221a3d 0%, #0f0920 55%, #050208 100%);
          overflow: hidden;
        }
        .pb-empty-glow {
          position: absolute;
          width: 460px;
          height: 460px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(155, 93, 229, 0.45) 0%, transparent 60%);
          filter: blur(30px);
          animation: pbGlowFloat 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes pbGlowFloat {
          0%,
          100% {
            transform: translate(-20px, -10px) scale(1);
          }
          50% {
            transform: translate(20px, 10px) scale(1.08);
          }
        }
        .pb-empty-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(ellipse at center, #000 20%, transparent 70%);
          pointer-events: none;
        }
        .pb-cam-ic {
          position: relative;
          width: 84px;
          height: 84px;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(155, 93, 229, 0.25), rgba(76, 201, 240, 0.15));
          border: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow:
            0 10px 30px -5px rgba(155, 93, 229, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          margin-bottom: 4px;
          z-index: 1;
        }
        .pb-cam-pulse {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 1px solid rgba(155, 93, 229, 0.5);
          animation: pbCamPulse 2s ease-out infinite;
        }
        @keyframes pbCamPulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        .pb-empty-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #fff 20%, #c6b0ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.01em;
          z-index: 1;
        }
        .pb-empty-sub {
          font-size: 13px;
          opacity: 0.65;
          margin: 0 0 8px;
          max-width: 320px;
          z-index: 1;
        }
        .pb-empty-sparkles {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 500;
          color: rgba(198, 176, 255, 0.75);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 6px;
          z-index: 1;
        }
        .pb-cam-corner {
          position: absolute;
          width: 20px;
          height: 20px;
          border-color: rgba(255, 255, 255, 0.6);
          border-style: solid;
          border-width: 0;
          pointer-events: none;
        }
        .pb-cam-corner.tl {
          top: 12px;
          left: 12px;
          border-top-width: 2px;
          border-left-width: 2px;
          border-top-left-radius: 6px;
        }
        .pb-cam-corner.tr {
          top: 12px;
          right: 12px;
          border-top-width: 2px;
          border-right-width: 2px;
          border-top-right-radius: 6px;
        }
        .pb-cam-corner.bl {
          bottom: 12px;
          left: 12px;
          border-bottom-width: 2px;
          border-left-width: 2px;
          border-bottom-left-radius: 6px;
        }
        .pb-cam-corner.br {
          bottom: 12px;
          right: 12px;
          border-bottom-width: 2px;
          border-right-width: 2px;
          border-bottom-right-radius: 6px;
        }
        .pb-live-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          color: #fff;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
          letter-spacing: 0.08em;
        }
        .pb-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff3b30;
          box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.3);
          animation: pbPulse 1.4s ease-in-out infinite;
        }
        @keyframes pbPulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
        .pb-side {
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 18px;
          min-width: 0;
          box-shadow: 0 10px 40px -20px rgba(0, 0, 0, 0.25);
          position: relative;
          overflow: hidden;
        }
        .pb-side.setup-side::before {
          content: "";
          position: absolute;
          top: -40%;
          right: -30%;
          width: 240px;
          height: 240px;
          background: radial-gradient(circle, rgba(155, 93, 229, 0.18), transparent 70%);
          filter: blur(20px);
          pointer-events: none;
        }
        .pb-side > * {
          position: relative;
        }
        .pb-side.wide {
          max-height: 100%;
        }
        .pb-setup-hero {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        .pb-setup-hero-ic {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #9b5de5, #4cc9f0);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 6px 20px -8px #9b5de5;
          flex-shrink: 0;
        }
        .pb-setup-hero-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
        }
        .pb-setup-hero-sub {
          font-size: 12px;
          color: var(--text);
          opacity: 0.6;
          margin-top: 2px;
        }
        .pb-side-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text);
          opacity: 0.9;
          padding-bottom: 8px;
          border-bottom: 1px dashed var(--border);
        }
        .pb-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pb-label {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text);
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .pb-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .pb-ctrl-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding-top: 4px;
        }
        .pb-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-radius: 8px;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          font-weight: 500;
        }
        .pb-chip:hover:not(:disabled) {
          border-color: var(--accent);
          transform: translateY(-1px);
        }
        .pb-chip:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .pb-chip.big {
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          min-width: 48px;
          justify-content: center;
        }
        .pb-chip.on {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
          box-shadow: 0 4px 12px -4px var(--accent);
        }
        .pb-chip.pill {
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 700;
          justify-content: center;
          min-width: 0;
          background: color-mix(in srgb, var(--bg) 80%, transparent);
        }
        .pb-chip.pill.flex {
          flex: 1;
        }
        .pb-chip.pill.on {
          background: linear-gradient(135deg, #9b5de5, #4cc9f0);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 6px 18px -6px rgba(155, 93, 229, 0.6);
        }
        .pb-chip-grid-6 {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
        }
        .pb-toggle {
          position: relative;
          display: inline-flex;
          align-items: center;
          background: color-mix(in srgb, var(--bg) 80%, transparent);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 4px;
          width: 100%;
          cursor: pointer;
          user-select: none;
        }
        .pb-toggle-thumb {
          position: absolute;
          top: 4px;
          bottom: 4px;
          left: 4px;
          width: calc(50% - 4px);
          background: linear-gradient(135deg, #9b5de5, #4cc9f0);
          border-radius: 999px;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px -4px rgba(155, 93, 229, 0.5);
        }
        .pb-toggle-thumb.on {
          transform: translateX(100%);
        }
        .pb-toggle-label {
          flex: 1;
          text-align: center;
          padding: 8px 0;
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          opacity: 0.5;
          z-index: 1;
          transition:
            color 0.2s,
            opacity 0.2s;
          letter-spacing: 0.05em;
        }
        .pb-toggle-label.on {
          color: #fff;
          opacity: 1;
        }
        .pb-mini-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pb-mini-strip {
          background: linear-gradient(145deg, #faf7f1, #f0e8d5);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.2);
          width: 92px;
          flex-shrink: 0;
        }
        .pb-mini-cell {
          position: relative;
          width: 100%;
          height: var(--mini-cell-h, 32px);
          background: linear-gradient(135deg, #ddd, #aaa);
          border-radius: 3px;
          overflow: hidden;
        }
        .pb-mini-cell-ic {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 800;
          font-size: 10px;
          background: linear-gradient(135deg, rgba(155, 93, 229, 0.55), rgba(76, 201, 240, 0.45));
        }
        .pb-mini-caption {
          text-align: center;
          font-size: 8px;
          color: #8a6a3f;
          font-family: "Courier New", monospace;
          letter-spacing: 0.08em;
          padding-top: 2px;
          line-height: 1.1;
        }
        .pb-mini-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .pb-mini-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: linear-gradient(135deg, #9b5de5, #4cc9f0);
          color: #fff;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          align-self: flex-start;
          box-shadow: 0 4px 12px -4px rgba(155, 93, 229, 0.5);
        }
        .pb-mini-meta-sub {
          font-size: 11px;
          color: var(--text);
          opacity: 0.65;
        }
        .pb-cta {
          margin-top: auto;
          padding-top: 4px;
        }
        .pb-edit-hero {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        .pb-edit-hero-ic {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #f72585, #9b5de5, #4cc9f0);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 6px 18px -6px #9b5de5;
          flex-shrink: 0;
        }
        .pb-edit-hero-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
        }
        .pb-edit-hero-sub {
          font-size: 11px;
          color: var(--text);
          opacity: 0.6;
          margin-top: 2px;
          letter-spacing: 0.03em;
        }
        .pb-tabs {
          display: flex;
          gap: 2px;
          background: color-mix(in srgb, var(--bg) 60%, transparent);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .pb-tab {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text);
          padding: 8px 6px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0.6;
          position: relative;
          min-width: 0;
        }
        .pb-tab > span:first-of-type {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pb-tab:hover {
          opacity: 1;
        }
        .pb-tab.on {
          background: linear-gradient(135deg, #ffffff, #f5f0ff);
          opacity: 1;
          box-shadow: 0 4px 12px -4px rgba(155, 93, 229, 0.3), 0 0 0 1px rgba(155, 93, 229, 0.2);
          color: #5a2e8c;
        }
        :global([data-theme="dark"]) .pb-tab.on {
          background: linear-gradient(135deg, #2a1f45, #1f1935);
          color: #d6b8ff;
          box-shadow: 0 4px 12px -4px rgba(155, 93, 229, 0.5), 0 0 0 1px rgba(155, 93, 229, 0.4);
        }
        .pb-tab-badge {
          font-size: 9px;
          padding: 1px 5px;
          background: color-mix(in srgb, var(--text) 10%, transparent);
          border-radius: 999px;
          font-weight: 700;
          line-height: 1.4;
          opacity: 0.75;
        }
        .pb-tab.on .pb-tab-badge {
          background: linear-gradient(135deg, #9b5de5, #4cc9f0);
          color: #fff;
          opacity: 1;
        }
        .pb-capture {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: center;
        }
        .pb-countdown {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .pb-countdown span {
          font-size: 180px;
          font-weight: 900;
          color: #fff;
          text-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
          font-family: "Playfair Display", Georgia, serif;
          animation: pbCountIn 1s ease-out;
        }
        @keyframes pbCountIn {
          0% {
            transform: scale(2);
            opacity: 0;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0.9;
          }
        }
        .pb-flash {
          position: absolute;
          inset: 0;
          background: #fff;
          opacity: 0;
          animation: pbFlash 0.6s ease-out;
          pointer-events: none;
        }
        @keyframes pbFlash {
          0% {
            opacity: 0.95;
          }
          100% {
            opacity: 0;
          }
        }
        .pb-progress {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          color: #fff;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
        }
        .pb-thumbs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .pb-thumb {
          width: 96px;
          aspect-ratio: 4 / 3;
          border-radius: 8px;
          background: var(--bg);
          border: 2px dashed var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text);
          opacity: 0.6;
          overflow: hidden;
          font-weight: 700;
          transition: all 0.3s;
        }
        .pb-thumb.done {
          opacity: 1;
          border-style: solid;
          border-color: var(--accent);
          transform: scale(1.02);
        }
        .pb-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pb-grid-edit {
          display: grid;
          grid-template-columns: auto minmax(280px, 420px);
          gap: 16px;
          align-items: start;
          justify-content: center;
        }
        @media (max-width: 960px) {
          .pb-grid-edit {
            grid-template-columns: 1fr;
            justify-items: center;
          }
        }
        .pb-strip-wrap {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
          padding: 24px;
          background: radial-gradient(ellipse at top, color-mix(in srgb, var(--accent) 6%, transparent), transparent 70%),
                      linear-gradient(145deg, var(--panel), color-mix(in srgb, var(--panel) 90%, #000));
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: 0 10px 40px -20px rgba(0, 0, 0, 0.25);
          position: relative;
          overflow: hidden;
        }
        .pb-strip-wrap::before {
          content: "";
          position: absolute;
          top: -20%;
          left: -20%;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(155, 93, 229, 0.15), transparent 70%);
          filter: blur(30px);
          pointer-events: none;
        }
        .pb-strip-wrap > * {
          position: relative;
        }
        .pb-strip {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          user-select: none;
          touch-action: none;
          transition:
            box-shadow 0.3s,
            background 0.3s;
          box-sizing: border-box;
        }
        .pb-strip-deco {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .pb-strip-deco :global(svg) {
          width: 100%;
          height: 100%;
        }
        .pb-strip-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
          padding: 20px;
          box-sizing: border-box;
          width: 100%;
        }
        .pb-strip-photo {
          display: block;
          width: 100%;
          height: auto;
          object-fit: cover;
          pointer-events: none;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .pb-strip-caption {
          text-align: center;
          pointer-events: none;
          padding-top: 8px;
          min-height: 48px;
        }
        .pb-caption-main {
          font-size: 26px;
          font-weight: 700;
          line-height: 1.1;
        }
        .pb-caption-date {
          font-size: 13px;
          opacity: 0.72;
          margin-top: 6px;
          font-family:
            ui-sans-serif,
            system-ui,
            -apple-system,
            "Segoe UI",
            Roboto;
          letter-spacing: 0.06em;
        }
        .pb-sticker {
          position: absolute;
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
        }
        .pb-sticker :global(svg) {
          width: 100%;
          height: 100%;
          pointer-events: none;
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
        }
        .pb-sticker.sel {
          outline: 2px dashed #fff;
          outline-offset: 3px;
          border-radius: 6px;
          box-shadow: 0 0 0 1px #000;
        }
        .pb-hint {
          font-size: 11px;
          color: var(--text);
          opacity: 0.6;
          margin: 0;
          font-style: italic;
        }
        .pb-filter-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          max-height: 420px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .pb-filter {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 4px;
          background: color-mix(in srgb, var(--bg) 70%, transparent);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 10px;
          font-weight: 700;
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pb-filter:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        .pb-filter-img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          border-radius: 6px;
          overflow: hidden;
        }
        .pb-filter img,
        .pb-filter-ph {
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: linear-gradient(135deg, #ffd1a1 0%, #ffb3d1 40%, #c9e8ff 70%, #c3f0ca 100%);
          display: block;
        }
        .pb-filter-check {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9b5de5, #4cc9f0);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        .pb-filter.on {
          border-color: #9b5de5;
          background: linear-gradient(145deg, color-mix(in srgb, #9b5de5 10%, var(--bg)), var(--bg));
          box-shadow: 0 4px 12px -4px rgba(155, 93, 229, 0.3);
        }
        .pb-theme-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          max-height: 440px;
          overflow-y: auto;
          padding: 6px;
          margin: -6px;
        }
        .pb-theme {
          position: relative;
          padding: 0;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pb-theme:hover {
          transform: translateY(-3px);
        }
        .pb-theme.on {
          transform: translateY(-3px);
        }
        .pb-theme-mini {
          position: relative;
          aspect-ratio: 3 / 4.5;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.25);
          transition: box-shadow 0.2s;
          background: #fff;
        }
        .pb-theme.on .pb-theme-mini {
          box-shadow: 0 12px 28px -8px rgba(155, 93, 229, 0.6), 0 0 0 2px #9b5de5;
        }
        .pb-theme-mini-deco {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .pb-theme-mini-deco :global(svg) {
          width: 100%;
          height: 100%;
        }
        .pb-theme-mini-inner {
          position: relative;
          z-index: 1;
          padding: 7px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          height: 100%;
          box-sizing: border-box;
        }
        .pb-theme-mini-ph {
          flex: 1;
          border-radius: 2px;
          min-height: 0;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
        }
        .pb-theme-mini-cap {
          font-size: 9px;
          font-weight: 700;
          text-align: center;
          padding: 3px 0 1px;
          line-height: 1.1;
          letter-spacing: 0.03em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }
        .pb-theme-check {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9b5de5, #4cc9f0);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px -2px rgba(155, 93, 229, 0.6), 0 0 0 2px var(--panel);
          z-index: 2;
        }
        .pb-drag-hint {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--text);
          opacity: 0.65;
          margin: 0 0 2px;
          padding: 6px 10px;
          background: color-mix(in srgb, var(--accent) 8%, transparent);
          border-radius: 8px;
          border: 1px dashed color-mix(in srgb, var(--accent) 30%, var(--border));
        }
        .pb-drag-hint b {
          color: var(--accent);
          font-weight: 700;
        }
        .pb-ghost {
          position: fixed;
          pointer-events: none;
          transform: translate(-50%, -50%);
          z-index: 9999;
          opacity: 0.9;
          filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.35));
          animation: pbGhostIn 0.12s ease-out;
        }
        .pb-ghost :global(svg) {
          width: 100%;
          height: 100%;
        }
        @keyframes pbGhostIn {
          from { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
        }
        .pb-strip.drop-hot {
          box-shadow: 0 0 0 3px #9b5de5, 0 20px 60px -15px rgba(155, 93, 229, 0.6) !important;
          outline: none;
        }
        .pb-strip.drop-hot::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(155, 93, 229, 0.08), rgba(76, 201, 240, 0.08));
          pointer-events: none;
          z-index: 10;
          animation: pbHotPulse 1.2s ease-in-out infinite;
        }
        @keyframes pbHotPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .pb-sticker-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 4px;
        }
        .pb-sticker-btn {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px;
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          aspect-ratio: 1;
          transition: all 0.15s;
          touch-action: none;
          user-select: none;
          -webkit-user-drag: none;
        }
        .pb-sticker-btn:hover {
          border-color: var(--accent);
          transform: scale(1.08);
        }
        .pb-sticker-btn:active {
          cursor: grabbing;
          transform: scale(0.95);
        }
        .pb-sticker-btn :global(svg) {
          width: 100%;
          height: 100%;
        }
        .pb-text-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
          max-height: 220px;
          overflow-y: auto;
        }
        .pb-text-btn {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px;
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          touch-action: none;
          user-select: none;
          -webkit-user-drag: none;
        }
        .pb-text-btn:active {
          cursor: grabbing;
          transform: scale(0.95);
        }
        .pb-text-btn :global(svg) {
          width: 100%;
          height: 100%;
          max-height: 30px;
        }
        .pb-text-btn:hover {
          border-color: var(--accent);
        }
        .pb-input {
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
        }
        .pb-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
        }
        .pb-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px dashed var(--border);
        }
      `}</style>
    </div>
  );
}
