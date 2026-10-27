import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import JsonTool from "./JsonTool";

export const metadata = toolMetadata("json");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/json" />
      <JsonTool />
      <ToolSeoContent slug="json" />
    </div>
  );
}
