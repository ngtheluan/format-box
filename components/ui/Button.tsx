"use client";
import Link from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "ghost" | "subtle" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export type ButtonProps =
  | (CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined })
  | (CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string });

const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(props, ref) {
  const { variant = "primary", size = "md", block, loading, leftIcon, rightIcon, className, children, ...rest } = props;

  const classes = cn(
    "ui-btn",
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    block && "ui-btn--block",
    loading && "ui-btn--loading",
    className,
  );

  const inner = (
    <>
      {loading && <span className="ui-btn-spin" aria-hidden="true" />}
      {!loading && leftIcon && <span className="ui-btn-ic">{leftIcon}</span>}
      {children != null && <span className="ui-btn-label">{children}</span>}
      {!loading && rightIcon && <span className="ui-btn-ic">{rightIcon}</span>}
    </>
  );

  if ("href" in props && props.href) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...anchorRest}
      >
        {inner}
      </Link>
    );
  }

  const { type = "button", disabled, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      disabled={disabled || loading}
      className={classes}
      {...buttonRest}
    >
      {inner}
    </button>
  );
});

export default Button;
