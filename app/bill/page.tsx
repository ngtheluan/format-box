"use client";
import { ToolHeader } from "@/components/ToolHeader";
import BillTool from "./BillTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/bill" />
      <BillTool />
    </div>
  );
}
