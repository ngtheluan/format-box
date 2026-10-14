"use client";
import { ToolHeader } from "@/components/ToolHeader";
import dynamic from "next/dynamic";

const TravelPlanTool = dynamic(() => import("./TravelPlanTool"), { ssr: false });

export default function Page() {
  return (
    <div className="page" style={{ maxWidth: 1240 }}>
      <ToolHeader href="/travel-plan" />
      <div className="tool-card">
        <TravelPlanTool />
      </div>
    </div>
  );
}
