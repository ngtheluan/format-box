import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import FormatFileTool from "./FormatFileTool";

export const metadata = toolMetadata("format-file");

export default function Page() {
  return (
    <div className="page">
      <FormatFileTool />
      <ToolSeoContent slug="format-file" />
    </div>
  );
}
