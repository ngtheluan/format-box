import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import WheelTool from "./WheelTool";

export const metadata = toolMetadata("wheel");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/wheel" />
      <WheelTool />
      <ToolSeoContent slug="wheel" />
    </div>
  );
}
