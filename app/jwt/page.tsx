"use client";
import { ToolHeader } from "@/components/ToolHeader";
import JwtTool from "./JwtTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/jwt" />
      <div className="tool-card">
        <JwtTool />
      </div>
    </div>
  );
}
