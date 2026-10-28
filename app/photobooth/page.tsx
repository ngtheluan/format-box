import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import PhotoboothTool from "./PhotoboothTool";

export const metadata = toolMetadata("photobooth");

export default function Page() {
  return (
    <div className="page">
      <PhotoboothTool />
      <ToolSeoContent slug="photobooth" />
    </div>
  );
}
