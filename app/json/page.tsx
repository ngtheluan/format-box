import type { Metadata } from "next";
import Nav from "@/components/Nav";
import JsonTool from "./JsonTool";

export const metadata: Metadata = {
  title: "JSON Formatter & Validator | FormatBox",
  description: "Format, validate, minify JSON ngay trên trình duyệt.",
};

export default function Page() {
  return (
    <>
      <Nav
        links={[
          { href: "/base64", label: "Base64" },
          { href: "/image", label: "Image" },
        ]}
      />
      <div className="page" style={{ maxWidth: 900 }}>
        <h1>📋 JSON <span>Formatter & Validator</span></h1>
        <p className="sub">Format, validate, minify JSON. Highlight lỗi, tree view, tính kích thước.</p>
        <JsonTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
