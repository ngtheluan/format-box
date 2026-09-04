import Nav from "@/components/Nav";
import { IconPhoto } from "@tabler/icons-react";
import type { Metadata } from "next";
import ImageTool from "./ImageTool";

export const metadata: Metadata = {
  title: "Image Converter | FormatBox",
  description: "Chuyển đổi PNG, JPG, WebP ngay trên trình duyệt.",
};

export default function Page() {
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1000 }}>
        <h1 className="page-title">
          <IconPhoto size={22} stroke={1.8} /> Image <span>Converter</span>
        </h1>
        <p className="sub">Chuyển đổi giữa PNG, JPG, WebP. Kéo thả ảnh, chỉnh chất lượng, tải về.</p>
        <ImageTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
