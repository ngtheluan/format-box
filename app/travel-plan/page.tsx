import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import TravelPlanTool from "./TravelPlanTool";

export const metadata = toolMetadata("travel-plan");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <TravelPlanTool />
      </div>
      <ToolSeoContent slug="travel-plan" />
    </div>
  );
}
