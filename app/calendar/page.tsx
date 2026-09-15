"use client";
import { ToolHeader } from "@/components/ToolHeader";
import CalendarTool from "./CalendarTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/calendar" />
      <div className="tool-card">
        <CalendarTool />
      </div>
    </div>
  );
}
