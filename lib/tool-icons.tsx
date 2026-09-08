import {
  IconBraces,
  IconBrowser,
  IconCalendar,
  IconChartDots3,
  IconClock,
  IconClockHour4,
  IconCloud,
  IconCoin,
  IconConfetti,
  IconCurrencyDollar,
  IconDevices,
  IconGasStation,
  IconGauge,
  IconKey,
  IconLetterCase,
  IconLock,
  IconMarkdown,
  IconPalette,
  IconPhoto,
  IconQuestionMark,
  IconReceipt,
  IconTerminal2,
  IconTicket,
  type Icon,
} from "@tabler/icons-react";

export const TOOL_ICONS: Record<string, Icon> = {
  IconBraces,
  IconBrowser,
  IconCalendar,
  IconChartDots3,
  IconClock,
  IconClockHour4,
  IconCloud,
  IconCoin,
  IconConfetti,
  IconCurrencyDollar,
  IconDevices,
  IconGasStation,
  IconGauge,
  IconKey,
  IconLetterCase,
  IconLock,
  IconMarkdown,
  IconPalette,
  IconPhoto,
  IconReceipt,
  IconTerminal2,
  IconTicket,
};

export const TOOL_ICON_NAMES = Object.keys(TOOL_ICONS).sort();

export function getToolIcon(name: string): Icon {
  return TOOL_ICONS[name] ?? IconQuestionMark;
}

export function ToolIcon({
  name,
  size = 18,
  stroke = 1.7,
  className,
}: {
  name: string;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const Cmp = getToolIcon(name);
  return <Cmp size={size} stroke={stroke} className={className} />;
}
