"use client";
import { ToolHeader } from "@/components/ToolHeader";
import PacmanTool from "./PacmanTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/pacman" />
      <div className="tool-card">
        <PacmanTool />
      </div>
    </div>
  );
}
