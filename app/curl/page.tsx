import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import CurlTool from "./CurlTool";

export const metadata = toolMetadata("curl");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <CurlTool />
      </div>
      <ToolSeoContent slug="curl" />
    </div>
  );
}
