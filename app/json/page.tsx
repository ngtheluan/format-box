import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import JsonTool from "./JsonTool";

export const metadata = toolMetadata("json");

export default function Page() {
  return (
    <div className="page">
      <JsonTool />
      <ToolSeoContent slug="json" />
    </div>
  );
}
