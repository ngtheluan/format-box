"use client";
import { ToolHeader } from "@/components/ToolHeader";
import dynamic from "next/dynamic";

const PacmanTool = dynamic(() => import("./PacmanTool"), { ssr: false });

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
