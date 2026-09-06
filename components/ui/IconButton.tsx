"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "subtle" | "danger";
  size?: "sm" | "md" | "lg";
  round?: boolean;
  "aria-label": string;
  children: ReactNode;
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "md", round, className, type = "button", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        "ui-iconbtn",
        `ui-iconbtn--${variant}`,
        `ui-iconbtn--${size}`,
        round && "ui-iconbtn--round",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});

export default IconButton;
