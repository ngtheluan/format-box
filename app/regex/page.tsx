"use client";
import { ToolHeader } from "@/components/ToolHeader";
import RegexTool from "./RegexTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/regex" />
      <div className="tool-card">
        <RegexTool />
      </div>
    </div>
  );
}
