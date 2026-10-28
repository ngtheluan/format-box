import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import GoldTool from "./GoldTool";

export const metadata = toolMetadata("gold");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <GoldTool />
      </div>
      <ToolSeoContent slug="gold" />
    </div>
  );
}
