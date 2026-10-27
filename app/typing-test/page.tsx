import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import TypingTestTool from "./TypingTestTool";

export const metadata = toolMetadata("typing-test");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/typing-test" />
      <div className="tool-card">
        <TypingTestTool />
      </div>
      <ToolSeoContent slug="typing-test" />
    </div>
  );
}
