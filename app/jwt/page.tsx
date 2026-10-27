import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import JwtTool from "./JwtTool";

export const metadata = toolMetadata("jwt");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/jwt" />
      <div className="tool-card">
        <JwtTool />
      </div>
      <ToolSeoContent slug="jwt" />
    </div>
  );
}
