import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import TravelPlanTool from "./TravelPlanTool";

export const metadata = toolMetadata("travel-plan");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/travel-plan" />
      <div className="tool-card">
        <TravelPlanTool />
      </div>
      <ToolSeoContent slug="travel-plan" />
    </div>
  );
}
