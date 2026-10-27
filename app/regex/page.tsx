import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import RegexTool from "./RegexTool";

export const metadata = toolMetadata("regex");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/regex" />
      <div className="tool-card">
        <RegexTool />
      </div>
      <ToolSeoContent slug="regex" />
    </div>
  );
}
