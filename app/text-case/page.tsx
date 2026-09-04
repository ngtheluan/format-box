import type { Metadata } from "next";
import { IconLetterCase } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import TextCaseTool from "./TextCaseTool";

export const metadata: Metadata = {
  title: "Text Case Converter | FormatBox",
  description: "Đổi giữa camelCase, snake_case, kebab-case, Title Case, UPPER và nhiều kiểu khác.",
};

export default function Page() {
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconLetterCase size={22} stroke={1.8} /> Text <span>Case Converter</span>
        </h1>
        <p className="sub">Paste text, xem mọi cách viết. Click vào card để copy.</p>
        <TextCaseTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
