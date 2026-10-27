import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import BillTool from "./BillTool";

export const metadata = toolMetadata("bill");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/bill" />
      <div className="tool-card">
        <BillTool />
      </div>
      <ToolSeoContent slug="bill" />
    </div>
  );
}
