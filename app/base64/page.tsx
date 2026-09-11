"use client";
import { ToolHeader } from "@/components/ToolHeader";
import Base64Tool from "./Base64Tool";

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/base64" />
      <Base64Tool />
    </div>
  );
}
