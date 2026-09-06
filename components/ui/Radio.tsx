"use client";
import { createContext, forwardRef, useContext, useId, type InputHTMLAttributes, type ReactNode } from "react";

type Ctx = { name: string; value?: string; onChange?: (v: string) => void };
const RadioCtx = createContext<Ctx | null>(null);

export type RadioGroupProps = {
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
};

export function RadioGroup({ name, value, onChange, children, className, orientation = "vertical" }: RadioGroupProps) {
  const gid = useId();
  return (
    <RadioCtx.Provider value={{ name: name ?? gid, value, onChange }}>
      <div
        role="radiogroup"
        className={["ui-radiogroup", `ui-radiogroup--${orientation}`, className].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </RadioCtx.Provider>
  );
}

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
  description?: ReactNode;
  value: string;
};

const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, description, className, value, checked, onChange, name, id, ...rest },
  ref,
) {
  const ctx = useContext(RadioCtx);
  const rid = useId();
  const inputId = id ?? rid;
  const isChecked = ctx ? ctx.value === value : checked;
  return (
    <label className={`ui-radio${rest.disabled ? " ui-radio--disabled" : ""}${className ? ` ${className}` : ""}`} htmlFor={inputId}>
      <input
        ref={ref}
        id={inputId}
        type="radio"
        className="ui-radio-el"
        name={ctx?.name ?? name}
        value={value}
        checked={isChecked}
        onChange={(e) => {
          ctx?.onChange?.(value);
          onChange?.(e);
        }}
        {...rest}
      />
      <span className="ui-radio-dot" aria-hidden="true" />
      {(label || description) && (
        <span className="ui-radio-text">
          {label && <span className="ui-radio-label">{label}</span>}
          {description && <span className="ui-radio-desc">{description}</span>}
        </span>
      )}
    </label>
  );
});

export default Radio;
