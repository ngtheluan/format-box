import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import MarkdownTool from "./MarkdownTool";

export const metadata = toolMetadata("markdown");

export default function Page() {
  return (
    <div className="page">
      <MarkdownTool />
      <ToolSeoContent slug="markdown" />
    </div>
  );
}
