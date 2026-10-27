import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import LicensePlateTool from "./LicensePlateTool";

export const metadata = toolMetadata("license-plate");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/license-plate" />
      <div className="tool-card">
        <LicensePlateTool />
      </div>
      <ToolSeoContent slug="license-plate" />
    </div>
  );
}
