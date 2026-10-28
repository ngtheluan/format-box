import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import LuckyTicketTool from "./LuckyTicketTool";

export const metadata = toolMetadata("lucky-ticket");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <LuckyTicketTool />
      </div>
      <ToolSeoContent slug="lucky-ticket" />
    </div>
  );
}
