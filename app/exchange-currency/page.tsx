import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import ExchangeCurrencyTool from "./ExchangeCurrencyTool";

export const metadata = toolMetadata("exchange-currency");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/exchange-currency" />
      <div className="tool-card">
        <ExchangeCurrencyTool />
      </div>
      <ToolSeoContent slug="exchange-currency" />
    </div>
  );
}
