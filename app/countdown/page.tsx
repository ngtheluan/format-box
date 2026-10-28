import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import CountdownTool from "./CountdownTool";

export const metadata = toolMetadata("countdown");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <CountdownTool />
      </div>
      <ToolSeoContent slug="countdown" />
    </div>
  );
}
