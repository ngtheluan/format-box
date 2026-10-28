import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import JwtTool from "./JwtTool";

export const metadata = toolMetadata("jwt");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <JwtTool />
      </div>
      <ToolSeoContent slug="jwt" />
    </div>
  );
}
