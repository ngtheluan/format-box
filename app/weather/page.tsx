import { ToolSeoContent } from "@/components/ToolSeoContent";
import { toolMetadata } from "@/lib/tools-shared";
import WeatherTool from "./WeatherTool";

export const metadata = toolMetadata("weather");

export default function Page() {
  return (
    <div className="page">
      <WeatherTool />
      <ToolSeoContent slug="weather" />
    </div>
  );
}
