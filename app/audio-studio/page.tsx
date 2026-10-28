import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import AudioStudioTool from "./AudioStudioTool";

export const metadata = toolMetadata("audio-studio");

export default function Page() {
  return (
    <div className="page">
      <AudioStudioTool />
      <ToolSeoContent slug="audio-studio" />
    </div>
  );
}
