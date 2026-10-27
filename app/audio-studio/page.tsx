import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import AudioStudioTool from "./AudioStudioTool";

export const metadata = toolMetadata("audio-studio");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/audio-studio" />
      <AudioStudioTool />
      <ToolSeoContent slug="audio-studio" />
    </div>
  );
}
