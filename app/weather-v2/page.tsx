"use client";
import { ToolHeader } from "@/components/ToolHeader";
import WeatherV2Tool from "./WeatherV2Tool";

export default function Page() {
  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <ToolHeader href="/weather-v2" />
      <div className="tool-card">
        <WeatherV2Tool />
      </div>
    </div>
  );
}
