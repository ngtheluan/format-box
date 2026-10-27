import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import Base64Tool from "./Base64Tool";

export const metadata = toolMetadata("base64");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/base64" />
      <div className="tool-card">
        <Base64Tool />
      </div>
      <ToolSeoContent slug="base64" />
    </div>
  );
}
