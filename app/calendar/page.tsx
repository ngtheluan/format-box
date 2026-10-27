import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import CalendarTool from "./CalendarTool";

export const metadata = toolMetadata("calendar");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/calendar" />
      <div className="tool-card">
        <CalendarTool />
      </div>
      <ToolSeoContent slug="calendar" />
    </div>
  );
}
