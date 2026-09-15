"use client";
import { ToolHeader } from "@/components/ToolHeader";
import TextCaseTool from "./TextCaseTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/text-case" />
      <div className="tool-card">
        <TextCaseTool />
      </div>
    </div>
  );
}
