import { ToolHeader } from "@/components/ToolHeader";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/seo-tools";
import WeatherTool from "./WeatherTool";

export const metadata = toolMetadata("weather");

export default function Page() {
  return (
    <div className="page">
      <ToolHeader href="/weather" />
      <div className="tool-card">
        <WeatherTool />
      </div>
      <ToolSeoContent slug="weather" />
    </div>
  );
}
