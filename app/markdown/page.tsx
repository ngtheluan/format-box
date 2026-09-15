"use client";
import { ToolHeader } from "@/components/ToolHeader";
import MarkdownTool from "./MarkdownTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/markdown" />
      <div className="tool-card">
        <MarkdownTool />
      </div>
    </div>
  );
}
