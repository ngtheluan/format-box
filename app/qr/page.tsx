import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import QrTool from "./QrTool";

export const metadata = toolMetadata("qr");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/qr" />
      <div className="tool-card">
        <QrTool />
      </div>
      <ToolSeoContent slug="qr" />
    </div>
  );
}
