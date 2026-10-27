import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import CountdownTool from "./CountdownTool";

export const metadata = toolMetadata("countdown");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/countdown" />
      <div className="tool-card">
        <CountdownTool />
      </div>
      <ToolSeoContent slug="countdown" />
    </div>
  );
}
