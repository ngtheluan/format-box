import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import GraphTool from "./GraphTool";

export const metadata = toolMetadata("graph");

export default function Page() {
  return (
    <div className="page">
      <GraphTool />
      <ToolSeoContent slug="graph" />
    </div>
  );
}
