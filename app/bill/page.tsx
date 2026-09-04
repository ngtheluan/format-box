import type { Metadata } from "next";
import { IconReceipt } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import BillTool from "./BillTool";

export const metadata: Metadata = {
  title: "Bill Splitter | FormatBox",
  description: "Nhập thông tin chi phí nhóm, xuất bill PNG chia đều cho mỗi người.",
};

export default function Page() {
  return (
    <>
      <Nav />
      <div className="page bill-page" style={{ maxWidth: 1200 }}>
        <h1 className="page-title">
          <IconReceipt size={22} stroke={1.8} /> Bill <span>Splitter</span>
        </h1>
        <p className="sub">Điền chi phí nhóm, xem preview và tải ảnh PNG hoặc copy vào clipboard.</p>
        <BillTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
