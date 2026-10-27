import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import GraphTool from "./GraphTool";

export const metadata = toolMetadata("graph");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/graph" />
      <GraphTool />
      <ToolSeoContent slug="graph" />
    </div>
  );
}
