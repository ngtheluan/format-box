"use client";
import { ToolHeader } from "@/components/ToolHeader";
import TimestampTool from "./TimestampTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/timestamp" />
      <div className="tool-card">
        <TimestampTool />
      </div>
    </div>
  );
}
