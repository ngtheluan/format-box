import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import GoldTool from "./GoldTool";

export const metadata = toolMetadata("gold");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/gold" />
      <div className="tool-card">
        <GoldTool />
      </div>
      <ToolSeoContent slug="gold" />
    </div>
  );
}
