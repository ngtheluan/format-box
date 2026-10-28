import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import ExchangeCurrencyTool from "./ExchangeCurrencyTool";

export const metadata = toolMetadata("exchange-currency");

export default function Page() {
  return (
    <div className="page">
      <div className="tool-card">
        <ExchangeCurrencyTool />
      </div>
      <ToolSeoContent slug="exchange-currency" />
    </div>
  );
}
