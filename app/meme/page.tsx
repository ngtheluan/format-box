"use client";
import { ToolHeader } from "@/components/ToolHeader";
import MemeTool from "./MemeTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/meme" />
      <div className="tool-card">
        <MemeTool />
      </div>
    </div>
  );
}
