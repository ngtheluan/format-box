"use client";
import { ToolHeader } from "@/components/ToolHeader";
import UuidTool from "./UuidTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/uuid" />
      <div className="tool-card">
        <UuidTool />
      </div>
    </div>
  );
}
