import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import TextCaseTool from "./TextCaseTool";

export const metadata = toolMetadata("text-case");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <TextCaseTool />
      </div>
      <ToolSeoContent slug="text-case" />
    </div>
  );
}
