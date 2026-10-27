import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import TimestampTool from "./TimestampTool";

export const metadata = toolMetadata("timestamp");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/timestamp" />
      <div className="tool-card">
        <TimestampTool />
      </div>
      <ToolSeoContent slug="timestamp" />
    </div>
  );
}
