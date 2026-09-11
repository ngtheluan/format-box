"use client";
import { ToolHeader } from "@/components/ToolHeader";
import ColorTool from "./ColorTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/color" />
      <ColorTool />
    </div>
  );
}
