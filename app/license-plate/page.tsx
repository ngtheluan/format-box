import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import LicensePlateTool from "./LicensePlateTool";

export const metadata = toolMetadata("license-plate");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <LicensePlateTool />
      </div>
      <ToolSeoContent slug="license-plate" />
    </div>
  );
}
