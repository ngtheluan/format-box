"use client";
import { ToolHeader } from "@/components/ToolHeader";
import dynamic from "next/dynamic";

const AudioStudioTool = dynamic(() => import("./AudioStudioTool"), { ssr: false });

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/audio-studio" />
      <AudioStudioTool />
    </div>
  );
}
