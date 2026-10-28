import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import UuidTool from "./UuidTool";

export const metadata = toolMetadata("uuid");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <UuidTool />
      </div>
      <ToolSeoContent slug="uuid" />
    </div>
  );
}
