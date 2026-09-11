"use client";
import { ToolHeader } from "@/components/ToolHeader";
import ResponsiveTool from "./ResponsiveTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/responsive" />
      <ResponsiveTool />
    </div>
  );
}
