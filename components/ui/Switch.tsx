"use client";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  label?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md" | "lg";
};

const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, description, size = "md", className, id, ...rest },
  ref,
) {
  const rid = `sw-${Math.random().toString(36).slice(2, 8)}`;
  const inputId = id ?? rid;
  return (
    <label
      className={[
        "ui-switch",
        `ui-switch--${size}`,
        rest.disabled && "ui-switch--disabled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      htmlFor={inputId}
    >
      <input ref={ref} id={inputId} type="checkbox" role="switch" className="ui-switch-el" {...rest} />
      <span className="ui-switch-track" aria-hidden="true">
        <span className="ui-switch-thumb" />
      </span>
      {(label || description) && (
        <span className="ui-switch-text">
          {label && <span className="ui-switch-label">{label}</span>}
          {description && <span className="ui-switch-desc">{description}</span>}
        </span>
      )}
    </label>
  );
});

export default Switch;
