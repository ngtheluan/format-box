import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import SpeedTestTool from "./SpeedTestTool";

export const metadata = toolMetadata("speed-test");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <SpeedTestTool />
      </div>
      <ToolSeoContent slug="speed-test" />
    </div>
  );
}
