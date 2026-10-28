import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import RegexTool from "./RegexTool";

export const metadata = toolMetadata("regex");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <RegexTool />
      </div>
      <ToolSeoContent slug="regex" />
    </div>
  );
}
