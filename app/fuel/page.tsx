import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import FuelTool from "./FuelTool";

export const metadata = toolMetadata("fuel");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <FuelTool />
      </div>
      <ToolSeoContent slug="fuel" />
    </div>
  );
}
