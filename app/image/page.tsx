import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import ImageTool from "./ImageTool";

export const metadata = toolMetadata("image");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <ImageTool />
      </div>
      <ToolSeoContent slug="image" />
    </div>
  );
}
