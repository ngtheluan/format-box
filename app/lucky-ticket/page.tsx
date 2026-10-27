import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import LuckyTicketTool from "./LuckyTicketTool";

export const metadata = toolMetadata("lucky-ticket");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/lucky-ticket" />
      <div className="tool-card">
        <LuckyTicketTool />
      </div>
      <ToolSeoContent slug="lucky-ticket" />
    </div>
  );
}
