import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import ImageTool from "./ImageTool";

export const metadata = toolMetadata("image");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/image" />
      <div className="tool-card">
        <ImageTool />
      </div>
      <ToolSeoContent slug="image" />
    </div>
  );
}
