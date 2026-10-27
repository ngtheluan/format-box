import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import ColorTool from "./ColorTool";

export const metadata = toolMetadata("color");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/color" />
      <div className="tool-card">
        <ColorTool />
      </div>
      <ToolSeoContent slug="color" />
    </div>
  );
}
