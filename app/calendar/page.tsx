import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import CalendarTool from "./CalendarTool";

export const metadata = toolMetadata("calendar");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <CalendarTool />
      </div>
      <ToolSeoContent slug="calendar" />
    </div>
  );
}
