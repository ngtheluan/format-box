import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import QrTool from "./QrTool";

export const metadata = toolMetadata("qr");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <QrTool />
      </div>
      <ToolSeoContent slug="qr" />
    </div>
  );
}
