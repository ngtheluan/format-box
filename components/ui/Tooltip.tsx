"use client";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export type TooltipProps = {
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement;
  delay?: number;
};

export default function Tooltip({ content, side = "top", children, delay = 0 }: TooltipProps) {
  const id = useId();
  if (!isValidElement(children)) return children;
  const trigger = cloneElement(children, { "aria-describedby": id } as Record<string, unknown>);
  return (
    <span
      className={`ui-tip ui-tip--${side}`}
      style={{ ["--ui-tip-delay" as string]: `${delay}ms` }}
    >
      {trigger}
      <span role="tooltip" id={id} className="ui-tip-bubble">
        {content}
      </span>
    </span>
  );
}
