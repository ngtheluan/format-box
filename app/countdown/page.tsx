"use client";
import { ToolHeader } from "@/components/ToolHeader";
import CountdownTool from "./CountdownTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/countdown" />
      <CountdownTool />
    </div>
  );
}
