import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import FuelTool from "./FuelTool";

export const metadata = toolMetadata("fuel");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/fuel" />
      <div className="tool-card">
        <FuelTool />
      </div>
      <ToolSeoContent slug="fuel" />
    </div>
  );
}
