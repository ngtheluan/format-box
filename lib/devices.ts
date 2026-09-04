export type Device = {
  id: string;
  name: string;
  width: number;
  height: number;
  category: "mobile" | "tablet" | "desktop";
  dpr?: number;
};

export const DEVICES: Device[] = [
  { id: "iphone-se", name: "iPhone SE", width: 375, height: 667, category: "mobile", dpr: 2 },
  { id: "iphone-16", name: "iPhone 16", width: 393, height: 852, category: "mobile", dpr: 3 },
  { id: "iphone-17-pro", name: "iPhone 17 Pro", width: 402, height: 874, category: "mobile", dpr: 3 },
  { id: "iphone-17-pm", name: "iPhone 17 Pro Max", width: 440, height: 956, category: "mobile", dpr: 3 },
  { id: "pixel-7", name: "Pixel 7", width: 412, height: 915, category: "mobile", dpr: 2.6 },
  { id: "galaxy-s22", name: "Galaxy S22", width: 360, height: 780, category: "mobile", dpr: 3 },
  { id: "ipad-mini", name: "iPad Mini", width: 768, height: 1024, category: "tablet", dpr: 2 },
  { id: "ipad-air", name: "iPad Air", width: 820, height: 1180, category: "tablet", dpr: 2 },
  { id: "ipad-pro-11", name: "iPad Pro 11″", width: 834, height: 1194, category: "tablet", dpr: 2 },
  { id: "ipad-pro-13", name: "iPad Pro 13″", width: 1024, height: 1366, category: "tablet", dpr: 2 },
  { id: "laptop", name: "Laptop 13″", width: 1280, height: 800, category: "desktop" },
  { id: "laptop-l", name: "Laptop 15″", width: 1440, height: 900, category: "desktop" },
  { id: "desktop", name: "Desktop HD", width: 1920, height: 1080, category: "desktop" },
  { id: "desktop-2k", name: "Desktop 2K", width: 2560, height: 1440, category: "desktop" },
];
