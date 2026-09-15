"use client";
import { ToolHeader } from "@/components/ToolHeader";
import ExchangeCurrencyTool from "./ExchangeCurrencyTool";

export default function Page() {
  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <ToolHeader href="/exchange-currency" />
      <div className="tool-card">
        <ExchangeCurrencyTool />
      </div>
    </div>
  );
}
