import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import WheelTool from "./WheelTool";

export const metadata = toolMetadata("wheel");

export default function Page() {
  return (
    <div className="page">
      <WheelTool />
      <ToolSeoContent slug="wheel" />
    </div>
  );
}
