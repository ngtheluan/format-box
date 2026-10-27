import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import FaviconExportTool from "./FaviconExportTool";

export const metadata = toolMetadata("favicon-export");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/favicon-export" />
      <div className="tool-card">
        <FaviconExportTool />
      </div>
      <ToolSeoContent slug="favicon-export" />
    </div>
  );
}
