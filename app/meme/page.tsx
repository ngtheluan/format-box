import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import MemeTool from "./MemeTool";

export const metadata = toolMetadata("meme");

export default function Page() {
  return (
    <div className="page">
      <MemeTool />
      <ToolSeoContent slug="meme" />
    </div>
  );
}
