"use client";
import { ToolHeader } from "@/components/ToolHeader";
import SpeedTestTool from "./SpeedTestTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/speed-test" />
      <SpeedTestTool />
    </div>
  );
}
