"use client";
import { ToolHeader } from "@/components/ToolHeader";
import PhotoboothTool from "./PhotoboothTool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/photobooth" />
      <PhotoboothTool />
    </div>
  );
}
