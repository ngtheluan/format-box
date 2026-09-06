"use client";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  label?: ReactNode;
  description?: ReactNode;
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id, ...rest },
  ref,
) {
  const inputId = id ?? (label ? `cb-${Math.random().toString(36).slice(2, 8)}` : undefined);
  return (
    <label className={`ui-check${rest.disabled ? " ui-check--disabled" : ""}${className ? ` ${className}` : ""}`} htmlFor={inputId}>
      <input ref={ref} id={inputId} type="checkbox" className="ui-check-el" {...rest} />
      <span className="ui-check-box" aria-hidden="true">
        <svg viewBox="0 0 12 12" width="12" height="12">
          <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </span>
      {(label || description) && (
        <span className="ui-check-text">
          {label && <span className="ui-check-label">{label}</span>}
          {description && <span className="ui-check-desc">{description}</span>}
        </span>
      )}
    </label>
  );
});

export default Checkbox;
