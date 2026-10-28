import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import FaviconExportTool from "./FaviconExportTool";

export const metadata = toolMetadata("favicon-export");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <FaviconExportTool />
      </div>
      <ToolSeoContent slug="favicon-export" />
    </div>
  );
}
