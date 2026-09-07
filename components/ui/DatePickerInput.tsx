"use client";
import { IconCalendar, IconX } from "@tabler/icons-react";
import { forwardRef, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import type { InputSize } from "./Input";

export type DatePickerInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "type" | "value" | "defaultValue" | "onChange"
> & {
  /** yyyy-mm-dd; empty string means "no date". Controlled. */
  value: string;
  onValueChange: (value: string) => void;
  /** Uncontrolled initial value (used only when value is undefined). */
  defaultValue?: string;
  inputSize?: InputSize;
  invalid?: boolean;
  leftIcon?: ReactNode;
  /** Show a ✕ button that clears the value when it's non-empty. */
  clearable?: boolean;
  /** Text on hover of the clear button. */
  clearTitle?: string;
};

/**
 * Themed wrapper around the native `<input type="date">`. Uses the app's
 * `.ui-input` shell so it lines up with Input/Select visually, keeps the
 * calendar affordance (native OS picker) and adds an optional clear button.
 */
const DatePickerInput = forwardRef<HTMLInputElement, DatePickerInputProps>(function DatePickerInput(
  {
    value,
    onValueChange,
    inputSize = "md",
    invalid,
    leftIcon,
    clearable = true,
    clearTitle = "Xoá",
    className,
    disabled,
    ...rest
  },
  ref,
) {
  const localRef = useRef<HTMLInputElement | null>(null);
  const setRefs = (el: HTMLInputElement | null) => {
    localRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as { current: HTMLInputElement | null }).current = el;
  };

  // Open the native OS date picker on any click within the shell. Chromium
  // exposes showPicker() on date inputs; Safari falls back to focus + click.
  const openPicker = () => {
    const el = localRef.current;
    if (!el || disabled) return;
    el.focus();
    const withPicker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof withPicker.showPicker === "function") {
      try {
        withPicker.showPicker();
      } catch {
        /* some browsers throw when called without a user gesture — ignore */
      }
    }
  };

  return (
    <div
      className={[
        "ui-input",
        `ui-input--${inputSize}`,
        invalid && "ui-input--invalid",
        disabled && "ui-input--disabled",
        "ui-input--date",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={openPicker}
      role="button"
      tabIndex={-1}
    >
      <span className="ui-input-ic" aria-hidden>
        {leftIcon ?? <IconCalendar size={14} stroke={1.9} />}
      </span>
      <input
        ref={setRefs}
        type="date"
        className="ui-input-el"
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
        onClick={(e) => {
          // Stop wrapper handler firing twice — the browser opens the picker
          // on the native input click too.
          e.stopPropagation();
        }}
        {...rest}
      />
      {clearable && value && !disabled && (
        <button
          type="button"
          className="ui-input-slot ui-date-clear"
          onClick={(e) => {
            e.stopPropagation();
            onValueChange("");
            localRef.current?.focus();
          }}
          aria-label={clearTitle}
          title={clearTitle}
        >
          <IconX size={14} stroke={2} />
        </button>
      )}
    </div>
  );
});

export default DatePickerInput;
