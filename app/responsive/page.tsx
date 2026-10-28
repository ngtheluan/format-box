import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import ResponsiveTool from "./ResponsiveTool";

export const metadata = toolMetadata("responsive");

export default function Page() {
  return (
    <div className="page">
      <ResponsiveTool />
      <ToolSeoContent slug="responsive" />
    </div>
  );
}
