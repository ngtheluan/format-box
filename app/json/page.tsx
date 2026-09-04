import Nav from "@/components/Nav";
import { IconBraces } from "@tabler/icons-react";
import type { Metadata } from "next";
import JsonTool from "./JsonTool";

export const metadata: Metadata = {
  title: "JSON Formatter & Validator | FormatBox",
  description: "Format, validate, minify JSON ngay trên trình duyệt.",
};

export default function Page() {
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1000 }}>
        <h1 className="page-title">
          <IconBraces size={22} stroke={1.8} /> JSON <span>Formatter & Validator</span>
        </h1>
        <p className="sub">Format, validate, minify JSON. Highlight lỗi, tree view, tính kích thước.</p>
        <JsonTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
