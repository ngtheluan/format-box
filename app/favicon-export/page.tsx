"use client";
import { ToolHeader } from "@/components/ToolHeader";
import FaviconExportTool from "./FaviconExportTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/favicon-export" />
      <FaviconExportTool />
    </div>
  );
}
