"use client";
import { ToolHeader } from "@/components/ToolHeader";
import ImageTool from "./ImageTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/image" />
      <ImageTool />
    </div>
  );
}
