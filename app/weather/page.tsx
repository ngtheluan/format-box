"use client";
import { ToolHeader } from "@/components/ToolHeader";
import WeatherTool from "./WeatherTool";

export default function Page() {
  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <ToolHeader href="/weather" />
      <div className="tool-card">
        <WeatherTool />
      </div>
    </div>
  );
}
