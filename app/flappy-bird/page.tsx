"use client";
import { ToolHeader } from "@/components/ToolHeader";
import FlappyBirdTool from "./FlappyBirdTool";

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
