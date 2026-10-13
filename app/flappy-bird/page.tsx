"use client";
import { ToolHeader } from "@/components/ToolHeader";
import dynamic from "next/dynamic";

const FlappyBirdTool = dynamic(() => import("./FlappyBirdTool"), { ssr: false });

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/flappy-bird" />
      <div className="tool-card">
        <FlappyBirdTool />
      </div>
    </div>
  );
}
