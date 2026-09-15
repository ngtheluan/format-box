"use client";
import { ToolHeader } from "@/components/ToolHeader";
import GraphTool from "./GraphTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/graph" />
      <div className="tool-card">
        <GraphTool />
      </div>
    </div>
  );
}
