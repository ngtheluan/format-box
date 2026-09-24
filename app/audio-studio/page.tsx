"use client";
import { ToolHeader } from "@/components/ToolHeader";
import AudioStudioTool from "./AudioStudioTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/audio-studio" />
      <AudioStudioTool />
    </div>
  );
}
