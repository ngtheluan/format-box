"use client";
import { ToolHeader } from "@/components/ToolHeader";
import WheelTool from "./WheelTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/wheel" />
      <WheelTool />
    </div>
  );
}
