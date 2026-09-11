"use client";
import { ToolHeader } from "@/components/ToolHeader";
import GoldTool from "./GoldTool";

export default function Page() {
  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <ToolHeader href="/gold" />
      <GoldTool />
    </div>
  );
}
