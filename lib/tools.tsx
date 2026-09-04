import {
  IconLock,
  IconBraces,
  IconChartDots3,
  IconKey,
  IconLetterCase,
  IconMarkdown,
  IconPhoto,
  IconReceipt,
  type Icon,
} from "@tabler/icons-react";

export type Tool = {
  href: string;
  Icon: Icon;
  title: string;
  sub: string;
  desc: string;
  tags: string[];
};

export const TOOLS: Tool[] = [
  {
    href: "/base64",
    Icon: IconLock,
    title: "Base64",
    sub: "Encode & Decode",
    desc: "Text, file, UTF-8 đầy đủ. Kéo thả, đổi chiều một chạm.",
    tags: ["text", "file", "utf-8"],
  },
  {
    href: "/json",
    Icon: IconBraces,
    title: "JSON",
    sub: "Format & Validate",
    desc: "Format, minify, validate. Tree view, đếm keys, tính kích thước.",
    tags: ["format", "minify", "tree"],
  },
  {
    href: "/graph",
    Icon: IconChartDots3,
    title: "JSON Graph",
    sub: "Visualize & Explore",
    desc: "Chuyển JSON thành đồ thị tương tác. Pan, zoom, khám phá cấu trúc.",
    tags: ["graph", "pan", "zoom"],
  },
  {
    href: "/image",
    Icon: IconPhoto,
    title: "Image",
    sub: "Convert & Compress",
    desc: "PNG, JPG, WebP qua lại. Chỉnh chất lượng, xem trước tức thì.",
    tags: ["png", "jpg", "webp"],
  },
  {
    href: "/bill",
    Icon: IconReceipt,
    title: "Bill Splitter",
    sub: "Share & Export",
    desc: "Chia tiền theo nhóm — nhập item, người tham gia, xuất bill PNG.",
    tags: ["bill", "split", "png"],
  },
  {
    href: "/jwt",
    Icon: IconKey,
    title: "JWT Decoder",
    sub: "Decode & Inspect",
    desc: "Giải mã header + payload, xem claims và trạng thái hết hạn.",
    tags: ["jwt", "token", "decode"],
  },
  {
    href: "/markdown",
    Icon: IconMarkdown,
    title: "Markdown Reader",
    sub: "Preview & Export",
    desc: "Đọc file Markdown, xem preview render trực tiếp, copy HTML.",
    tags: ["markdown", "md", "preview"],
  },
  {
    href: "/text-case",
    Icon: IconLetterCase,
    title: "Text Case",
    sub: "Convert & Copy",
    desc: "Đổi giữa camel, snake, kebab, Title, UPPER và nhiều kiểu khác.",
    tags: ["case", "camel", "snake", "kebab"],
  },
];
