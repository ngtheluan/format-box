"use client";
import { ToolHeader } from "@/components/ToolHeader";
import CurlTool from "./CurlTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/curl" />
      <div className="tool-card">
        <CurlTool />
      </div>
    </div>
  );
}
