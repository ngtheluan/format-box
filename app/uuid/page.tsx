import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import UuidTool from "./UuidTool";

export const metadata = toolMetadata("uuid");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/uuid" />
      <div className="tool-card">
        <UuidTool />
      </div>
      <ToolSeoContent slug="uuid" />
    </div>
  );
}
