import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import CurlTool from "./CurlTool";

export const metadata = toolMetadata("curl");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/curl" />
      <div className="tool-card">
        <CurlTool />
      </div>
      <ToolSeoContent slug="curl" />
    </div>
  );
}
