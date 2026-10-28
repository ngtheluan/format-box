import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import TimestampTool from "./TimestampTool";

export const metadata = toolMetadata("timestamp");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <TimestampTool />
      </div>
      <ToolSeoContent slug="timestamp" />
    </div>
  );
}
