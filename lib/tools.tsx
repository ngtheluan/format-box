import {
  IconBraces,
  IconChartDots3,
  IconClock,
  IconCoin,
  IconConfetti,
  IconDevices,
  IconGasStation,
  IconKey,
  IconLetterCase,
  IconLock,
  IconMarkdown,
  IconPhoto,
  IconReceipt,
  IconTerminal2,
  type Icon,
} from "@tabler/icons-react";
import type { Lang } from "./i18n";

type Bilingual = { vi: string; en: string };

export type ToolCategory = "text" | "media" | "dev" | "life";

export type Tool = {
  href: string;
  Icon: Icon;
  title: string;
  sub: Bilingual;
  desc: Bilingual;
  tags: string[];
  category: ToolCategory;
};

export const CATEGORY_ORDER: ToolCategory[] = ["text", "media", "dev", "life"];

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
    category: "text",
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
    category: "text",
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
    category: "text",
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
    category: "media",
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
    category: "media",
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
    category: "text",
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
    category: "text",
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
    category: "text",
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
    category: "dev",
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
    category: "life",
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
    category: "life",
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
    category: "life",
  },
  {
    href: "/gold",
    Icon: IconCoin,
    title: "Gold Price",
    sub: { vi: "Giá vàng SJC realtime", en: "Live SJC gold prices" },
    desc: {
      vi: "Giá vàng SJC theo chi nhánh, cập nhật realtime từ feed chính thức của SJC.",
      en: "SJC gold prices by branch, streamed from the official SJC feed.",
    },
    tags: ["gold", "sjc", "vn", "vang"],
    category: "life",
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
    category: "dev",
  },
];

export const toolSub = (t: Tool, lang: Lang) => t.sub[lang];
export const toolDesc = (t: Tool, lang: Lang) => t.desc[lang];

// Backwards-compat search hay for matching in menu
export const toolSearchable = (t: Tool) =>
  [t.title, t.sub.vi, t.sub.en, t.desc.vi, t.desc.en, t.href, ...t.tags].join(" ").toLowerCase();
