"use client";
import { ToolHeader } from "@/components/ToolHeader";
import QrTool from "./QrTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/qr" />
      <div className="tool-card">
        <QrTool />
      </div>
    </div>
  );
}
