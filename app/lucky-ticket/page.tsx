"use client";
import { ToolHeader } from "@/components/ToolHeader";
import LuckyTicketTool from "./LuckyTicketTool";

export default function Page() {
  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <ToolHeader href="/lucky-ticket" />
      <div className="tool-card">
        <LuckyTicketTool />
      </div>
    </div>
  );
}
