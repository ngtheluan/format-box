import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import TypingTestTool from "./TypingTestTool";

export const metadata = toolMetadata("typing-test");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <TypingTestTool />
      </div>
      <ToolSeoContent slug="typing-test" />
    </div>
  );
}
