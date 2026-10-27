import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import MarkdownTool from "./MarkdownTool";

export const metadata = toolMetadata("markdown");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/markdown" />
      <MarkdownTool />
      <ToolSeoContent slug="markdown" />
    </div>
  );
}
