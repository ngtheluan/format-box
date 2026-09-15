"use client";
import { ToolHeader } from "@/components/ToolHeader";
import JsonTool from "./JsonTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/json" />
      <div className="tool-card">
        <JsonTool />
      </div>
    </div>
  );
}
