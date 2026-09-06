"use client";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export type InputSize = "sm" | "md" | "lg";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  inputSize?: InputSize;
  invalid?: boolean;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  monospace?: boolean;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { inputSize = "md", invalid, leftIcon, rightSlot, monospace, className, ...rest },
  ref,
) {
  return (
    <div
      className={[
        "ui-input",
        `ui-input--${inputSize}`,
        invalid && "ui-input--invalid",
        monospace && "ui-input--mono",
        rest.disabled && "ui-input--disabled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {leftIcon && <span className="ui-input-ic">{leftIcon}</span>}
      <input ref={ref} className="ui-input-el" {...rest} />
      {rightSlot && <span className="ui-input-slot">{rightSlot}</span>}
    </div>
  );
});

export default Input;
