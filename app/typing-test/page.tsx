"use client";
import { ToolHeader } from "@/components/ToolHeader";
import TypingTestTool from "./TypingTestTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/typing-test" />
      <div className="tool-card">
        <TypingTestTool />
      </div>
    </div>
  );
}
