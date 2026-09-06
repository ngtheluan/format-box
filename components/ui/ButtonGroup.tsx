"use client";
import type { HTMLAttributes, ReactNode } from "react";

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  attached?: boolean;
  vertical?: boolean;
  children: ReactNode;
};

export default function ButtonGroup({ attached, vertical, className, children, ...rest }: ButtonGroupProps) {
  return (
    <div
      className={[
        "ui-btngroup",
        attached && "ui-btngroup--attached",
        vertical && "ui-btngroup--v",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="group"
      {...rest}
    >
      {children}
    </div>
  );
}
