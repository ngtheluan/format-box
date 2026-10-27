import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import PhotoboothTool from "./PhotoboothTool";

export const metadata = toolMetadata("photobooth");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/photobooth" />
      <PhotoboothTool />
      <ToolSeoContent slug="photobooth" />
    </div>
  );
}
