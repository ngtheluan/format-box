import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import BmiTool from "./BmiTool";

export const metadata = toolMetadata("bmi-check");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <BmiTool />
      </div>
      <ToolSeoContent slug="bmi-check" />
    </div>
  );
}
