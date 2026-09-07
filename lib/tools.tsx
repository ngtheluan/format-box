import {
  IconBraces,
  IconBrowser,
  IconCalendar,
  IconChartDots3,
  IconClock,
  IconClockHour4,
  IconCloud,
  IconCoin,
  IconConfetti,
  IconDevices,
  IconGasStation,
  IconGauge,
  IconKey,
  IconLetterCase,
  IconLock,
  IconMarkdown,
  IconPalette,
  IconPhoto,
  IconReceipt,
  IconTerminal2,
  IconTicket,
  type Icon,
} from "@tabler/icons-react";
import type { Lang } from "./i18n";

type Bilingual = { vi: string; en: string };

export type ToolCategory = "cat_text" | "cat_media" | "cat_dev" | "cat_life";

export type Tool = {
  href: string;
  Icon: Icon;
  title: string;
  sub: Bilingual;
  desc: Bilingual;
  tags: string[];
  category: ToolCategory;
};

export const CATEGORY_ORDER: ToolCategory[] = ["cat_text", "cat_media", "cat_dev", "cat_life"];

export const TOOLS: Tool[] = [
  {
    href: "/base64",
    Icon: IconLock,
    title: "Base64",
    sub: { vi: "Encode & Decode", en: "Encode & Decode" },
    desc: {
      vi: "Text, file, UTF-8 đầy đủ. Kéo thả, đổi chiều một chạm.",
      en: "Text, files, full UTF-8. Drag-drop and swap in one click.",
    },
    tags: ["text", "file", "utf-8"],
    category: "cat_text",
  },
  {
    href: "/json",
    Icon: IconBraces,
    title: "JSON",
    sub: { vi: "Format & Validate", en: "Format & Validate" },
    desc: {
      vi: "Format, minify, validate. Tree view, đếm keys, tính kích thước.",
      en: "Format, minify, validate. Tree view, key count, size info.",
    },
    tags: ["format", "minify", "tree"],
    category: "cat_text",
  },
  {
    href: "/graph",
    Icon: IconChartDots3,
    title: "JSON Graph",
    sub: { vi: "Visualize & Explore", en: "Visualize & Explore" },
    desc: {
      vi: "Chuyển JSON thành đồ thị tương tác. Pan, zoom, khám phá cấu trúc.",
      en: "Turn JSON into an interactive graph. Pan, zoom, explore.",
    },
    tags: ["graph", "pan", "zoom"],
    category: "cat_text",
  },
  {
    href: "/image",
    Icon: IconPhoto,
    title: "Image Converter",
    sub: { vi: "Convert & Compress", en: "Convert & Compress" },
    desc: {
      vi: "PNG, JPG, WebP qua lại. Chỉnh chất lượng, xem trước tức thì.",
      en: "PNG, JPG, WebP. Tune quality, live preview.",
    },
    tags: ["png", "jpg", "webp"],
    category: "cat_media",
  },
  {
    href: "/favicon-export",
    Icon: IconBrowser,
    title: "Favicon Export",
    sub: { vi: "Sinh bộ favicon", en: "Generate favicon set" },
    desc: {
      vi: "Upload 1 ảnh, sinh đầy đủ favicon 16→512, apple-touch, PWA. Kèm snippet HTML.",
      en: "Upload one image, get the full favicon set 16→512, apple-touch, PWA. HTML snippet included.",
    },
    tags: ["favicon", "icon", "pwa", "apple-touch", "manifest"],
    category: "cat_media",
  },
  {
    href: "/bill",
    Icon: IconReceipt,
    title: "Bill Splitter",
    sub: { vi: "Share & Export", en: "Share & Export" },
    desc: {
      vi: "Chia tiền theo nhóm — nhập item, người tham gia, xuất bill PNG.",
      en: "Split expenses in a group — items, people, export as PNG.",
    },
    tags: ["bill", "split", "png"],
    category: "cat_media",
  },
  {
    href: "/jwt",
    Icon: IconKey,
    title: "JWT Decoder",
    sub: { vi: "Decode & Inspect", en: "Decode & Inspect" },
    desc: {
      vi: "Giải mã header + payload, xem claims và trạng thái hết hạn.",
      en: "Decode header + payload, inspect claims and expiry.",
    },
    tags: ["jwt", "token", "decode"],
    category: "cat_text",
  },
  {
    href: "/markdown",
    Icon: IconMarkdown,
    title: "Markdown Reader",
    sub: { vi: "Preview & Export", en: "Preview & Export" },
    desc: {
      vi: "Đọc file Markdown, xem preview render trực tiếp, copy HTML.",
      en: "Read Markdown files, live preview, copy HTML.",
    },
    tags: ["markdown", "md", "preview"],
    category: "cat_text",
  },
  {
    href: "/text-case",
    Icon: IconLetterCase,
    title: "Text Case",
    sub: { vi: "Convert & Copy", en: "Convert & Copy" },
    desc: {
      vi: "Đổi giữa camel, snake, kebab, Title, UPPER và nhiều kiểu khác.",
      en: "Switch between camel, snake, kebab, Title, UPPER and more.",
    },
    tags: ["case", "camel", "snake", "kebab"],
    category: "cat_text",
  },
  {
    href: "/responsive",
    Icon: IconDevices,
    title: "Responsive Tester",
    sub: { vi: "Preview & Compare", en: "Preview & Compare" },
    desc: {
      vi: "Xem website ở nhiều kích thước iPhone, iPad, laptop, desktop.",
      en: "View any website across iPhone, iPad, laptop, desktop sizes.",
    },
    tags: ["responsive", "device", "preview"],
    category: "cat_dev",
  },
  {
    href: "/fuel",
    Icon: IconGasStation,
    title: "Fuel Price",
    sub: { vi: "Giá xăng dầu VN", en: "VN fuel prices" },
    desc: {
      vi: "Giá bán lẻ xăng dầu theo vùng (nguồn Petrolimex), cập nhật mỗi kỳ điều chỉnh.",
      en: "Retail fuel prices by region (Petrolimex source), refreshed each cycle.",
    },
    tags: ["fuel", "petrolimex", "vn"],
    category: "cat_life",
  },
  {
    href: "/gold",
    Icon: IconCoin,
    title: "Gold Price",
    sub: { vi: "Giá vàng VN realtime", en: "Live VN gold prices" },
    desc: {
      vi: "Giá vàng SJC, PNJ, 24K, 18K… đầy đủ. Nguồn PNJ live, cập nhật vài phút một lần.",
      en: "SJC, PNJ 24K, 18K and more. Live PNJ feed, refreshed every few minutes.",
    },
    tags: ["gold", "sjc", "pnj", "vn", "vang"],
    category: "cat_life",
  },
  {
    href: "/lucky-ticket",
    Icon: IconTicket,
    title: "Lucky Ticket",
    sub: { vi: "Dò vé số Việt Nam", en: "VN lottery checker" },
    desc: {
      vi: "Dò vé số 3 miền theo kết quả realtime. Nhập số, xem ngay trúng giải nào.",
      en: "Check Vietnamese lottery tickets against live results across 3 regions.",
    },
    tags: ["lottery", "xo-so", "vn", "ticket", "do-ve-so"],
    category: "cat_life",
  },
  {
    href: "/wheel",
    Icon: IconConfetti,
    title: "Lucky Wheel",
    sub: { vi: "Spin & Pick", en: "Spin & Pick" },
    desc: {
      vi: "Vòng quay may mắn — nhập danh sách, quay, chọn ngẫu nhiên.",
      en: "Lucky wheel — enter a list, spin, pick randomly.",
    },
    tags: ["random", "picker", "wheel"],
    category: "cat_life",
  },
  {
    href: "/calendar",
    Icon: IconCalendar,
    title: "Calendar",
    sub: { vi: "Lịch dương & âm", en: "Solar & Lunar" },
    desc: {
      vi: "Xem lịch dương kèm âm lịch Việt Nam. Chọn ngày để xem ngày/tháng/năm can chi.",
      en: "Solar calendar with Vietnamese lunar dates. Pick a day to see its Can Chi day/month/year.",
    },
    tags: ["calendar", "lunar", "am-lich", "duong-lich", "vn"],
    category: "cat_life",
  },
  {
    href: "/countdown",
    Icon: IconClock,
    title: "Countdown",
    sub: { vi: "Đếm ngược sự kiện", en: "Event countdown" },
    desc: {
      vi: "Đếm ngược tới ngày quan trọng — sinh nhật, năm mới, deadline. Lưu nhiều mốc.",
      en: "Count down to important moments — birthdays, new year, deadlines. Save many events.",
    },
    tags: ["countdown", "timer", "event"],
    category: "cat_life",
  },
  {
    href: "/weather",
    Icon: IconCloud,
    title: "Weather",
    sub: { vi: "Thời tiết realtime", en: "Realtime weather" },
    desc: {
      vi: "Xem thời tiết hiện tại và dự báo 7 ngày cho bất kỳ thành phố nào. Nguồn Open-Meteo.",
      en: "Current conditions and 7-day forecast for any city. Powered by Open-Meteo.",
    },
    tags: ["weather", "forecast", "thoi-tiet"],
    category: "cat_life",
  },
  {
    href: "/timestamp",
    Icon: IconClockHour4,
    title: "Timestamp",
    sub: { vi: "Unix ↔ Date", en: "Unix ↔ Date" },
    desc: {
      vi: "Chuyển đổi Unix timestamp qua lại với ngày giờ. ISO, UTC, local, relative time.",
      en: "Convert Unix timestamps to and from dates. ISO, UTC, local, relative time.",
    },
    tags: ["timestamp", "unix", "epoch", "iso", "date"],
    category: "cat_dev",
  },
  {
    href: "/speed-test",
    Icon: IconGauge,
    title: "Speed Test",
    sub: { vi: "Đo tốc độ mạng", en: "Network speed" },
    desc: {
      vi: "Đo tốc độ Wi-Fi / mạng: download, upload, ping, jitter. Chạy trực tiếp trên trình duyệt, chính xác.",
      en: "Measure Wi-Fi / network speed: download, upload, ping, jitter. Runs in your browser, accurate.",
    },
    tags: ["speed", "wifi", "network", "internet", "mbps", "ping"],
    category: "cat_dev",
  },
  {
    href: "/color",
    Icon: IconPalette,
    title: "Color",
    sub: { vi: "Convert & Inspect", en: "Convert & Inspect" },
    desc: {
      vi: "HEX, RGB, HSL, HSB, OKLCH. Bảng tint/shade, contrast WCAG, copy một chạm.",
      en: "HEX, RGB, HSL, HSB, OKLCH. Tint/shade palette, WCAG contrast, one-click copy.",
    },
    tags: ["color", "hex", "rgb", "hsl", "oklch", "palette", "contrast", "wcag"],
    category: "cat_dev",
  },
  {
    href: "/curl",
    Icon: IconTerminal2,
    title: "cURL Runner",
    sub: { vi: "Paste & Send", en: "Paste & Send" },
    desc: {
      vi: "Dán cURL, xem parse request và response giống Postman.",
      en: "Paste a cURL command, inspect request and response Postman-style.",
    },
    tags: ["curl", "http", "api"],
    category: "cat_dev",
  },
];

export const toolSub = (t: Tool, lang: Lang) => t.sub[lang];
export const toolDesc = (t: Tool, lang: Lang) => t.desc[lang];

// Backwards-compat search hay for matching in menu
export const toolSearchable = (t: Tool) =>
  [t.title, t.sub.vi, t.sub.en, t.desc.vi, t.desc.en, t.href, ...t.tags].join(" ").toLowerCase();
