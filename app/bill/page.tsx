import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import BillTool from "./BillTool";

export const metadata = toolMetadata("bill");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <BillTool />
      </div>
      <ToolSeoContent slug="bill" />
    </div>
  );
}
