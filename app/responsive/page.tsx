import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import ResponsiveTool from "./ResponsiveTool";

export const metadata = toolMetadata("responsive");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/responsive" />
      <ResponsiveTool />
      <ToolSeoContent slug="responsive" />
    </div>
  );
}
