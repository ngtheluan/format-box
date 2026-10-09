"use client";
import { ToolHeader } from "@/components/ToolHeader";
import LicensePlateTool from "./LicensePlateTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/license-plate" />
      <div className="tool-card">
        <LicensePlateTool />
      </div>
    </div>
  );
}
