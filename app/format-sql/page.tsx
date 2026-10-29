import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import FormatSqlTool from "./FormatSqlTool";

export const metadata = toolMetadata("format-sql");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <FormatSqlTool />
      </div>
      <ToolSeoContent slug="format-sql" />
    </div>
  );
}
