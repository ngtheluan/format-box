import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import WorkflowTimelineTool from "./WorkflowTimelineTool";

export const metadata = toolMetadata("workflow-timeline");

export default function Page() {
  return (
    <div className="page">
      <WorkflowTimelineTool />
      <ToolSeoContent slug="workflow-timeline" />
    </div>
  );
}
