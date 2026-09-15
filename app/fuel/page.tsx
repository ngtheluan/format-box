"use client";
import { ToolHeader } from "@/components/ToolHeader";
import FuelTool from "./FuelTool";

export default function Page() {
  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <ToolHeader href="/fuel" />
      <div className="tool-card">
        <FuelTool />
      </div>
    </div>
  );
}
