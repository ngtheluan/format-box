"use client";
import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "solid" | "outline" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
};

export function Card({ variant = "outline", padding = "md", interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={[
        "ui-card",
        `ui-card--${variant}`,
        `ui-card--p-${padding}`,
        interactive && "ui-card--int",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={["ui-card-head", className].filter(Boolean).join(" ")} {...rest} />;
}
export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={["ui-card-title", className].filter(Boolean).join(" ")} {...rest} />;
}
export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={["ui-card-desc", className].filter(Boolean).join(" ")} {...rest} />;
}
export function CardBody({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={["ui-card-body", className].filter(Boolean).join(" ")}>{children}</div>;
}
export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={["ui-card-foot", className].filter(Boolean).join(" ")} {...rest} />;
}

export default Card;
