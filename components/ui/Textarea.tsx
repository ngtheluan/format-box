"use client";
import { forwardRef, type TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  monospace?: boolean;
  autoGrow?: boolean;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, monospace, autoGrow, className, onInput, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={[
        "ui-textarea",
        invalid && "ui-textarea--invalid",
        monospace && "ui-textarea--mono",
        autoGrow && "ui-textarea--grow",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onInput={(e) => {
        if (autoGrow) {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }
        onInput?.(e);
      }}
      {...rest}
    />
  );
});

export default Textarea;
