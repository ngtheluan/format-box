import type { Metadata } from "next";
import { IconLock } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import Base64Tool from "./Base64Tool";

export const metadata: Metadata = {
  title: "Base64 Encode / Decode | FormatBox",
  description: "Mã hóa và giải mã Base64 ngay trên trình duyệt.",
};

export default function Page() {
  return (
    <>
      <Nav
        links={[
          { href: "/image", label: "Image" },
          { href: "/json", label: "JSON" },
        ]}
      />
      <div className="page">
        <h1 className="page-title"><IconLock size={22} stroke={1.8} /> Base64 <span>Encode / Decode</span></h1>
        <p className="sub">Mã hóa hoặc giải mã Base64. Hỗ trợ text UTF-8 và file. Xử lý ngay trên trình duyệt.</p>
        <Base64Tool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
