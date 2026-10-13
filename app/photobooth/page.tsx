"use client";
import { ToolHeader } from "@/components/ToolHeader";
import dynamic from "next/dynamic";

const PhotoboothTool = dynamic(() => import("./PhotoboothTool"), { ssr: false });

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/photobooth" />
      <PhotoboothTool />
    </div>
  );
}
