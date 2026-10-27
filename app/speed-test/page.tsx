import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import SpeedTestTool from "./SpeedTestTool";

export const metadata = toolMetadata("speed-test");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/speed-test" />
      <div className="tool-card">
        <SpeedTestTool />
      </div>
      <ToolSeoContent slug="speed-test" />
    </div>
  );
}
