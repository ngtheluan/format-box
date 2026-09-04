import type { Metadata } from "next";
import { IconMarkdown } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import MarkdownTool from "./MarkdownTool";

export const metadata: Metadata = {
  title: "Markdown Reader | FormatBox",
  description: "Đọc và preview file Markdown ngay trên trình duyệt.",
};

export default function Page() {
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1240 }}>
        <h1 className="page-title">
          <IconMarkdown size={22} stroke={1.8} /> Markdown <span>Reader</span>
        </h1>
        <p className="sub">
          Paste, kéo thả .md, xem preview trực tiếp. Copy HTML hoặc tải file HTML về.
        </p>
        <MarkdownTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
