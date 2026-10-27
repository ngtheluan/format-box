import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import MemeTool from "./MemeTool";

export const metadata = toolMetadata("meme");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/meme" />
      <MemeTool />
      <ToolSeoContent slug="meme" />
    </div>
  );
}
