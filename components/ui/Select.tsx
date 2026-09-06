"use client";
import { forwardRef, type SelectHTMLAttributes } from "react";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  options: SelectOption[];
  selectSize?: "sm" | "md" | "lg";
  invalid?: boolean;
  placeholder?: string;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, selectSize = "md", invalid, placeholder, className, ...rest },
  ref,
) {
  return (
    <div
      className={[
        "ui-select",
        `ui-select--${selectSize}`,
        invalid && "ui-select--invalid",
        rest.disabled && "ui-select--disabled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <select ref={ref} className="ui-select-el" {...rest}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="ui-select-caret" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
});

export default Select;
