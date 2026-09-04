import type { Metadata } from "next";
import { IconChartDots3 } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import GraphTool from "./GraphTool";

export const metadata: Metadata = {
  title: "JSON Graph Visualizer | FormatBox",
  description: "Chuyển JSON thành đồ thị tương tác — pan, zoom, khám phá cấu trúc.",
};

export default function Page() {
  return (
    <>
      <Nav />
      <div className="page graph-page">
        <h1 className="page-title">
          <IconChartDots3 size={22} stroke={1.8} /> JSON <span>Graph Visualizer</span>
        </h1>
        <p className="sub">Chuyển JSON thành đồ thị tương tác. Pan, zoom, khám phá cấu trúc dữ liệu.</p>
        <GraphTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
