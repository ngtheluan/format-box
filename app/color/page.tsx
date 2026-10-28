import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import ColorTool from "./ColorTool";

export const metadata = toolMetadata("color");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <ColorTool />
      </div>
      <ToolSeoContent slug="color" />
    </div>
  );
}
