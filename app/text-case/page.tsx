import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import TextCaseTool from "./TextCaseTool";

export const metadata = toolMetadata("text-case");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/text-case" />
      <div className="tool-card">
        <TextCaseTool />
      </div>
      <ToolSeoContent slug="text-case" />
    </div>
  );
}
