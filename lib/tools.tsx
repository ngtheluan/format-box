import {
  IconLock,
  IconBraces,
  IconChartDots3,
  IconPhoto,
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
];
