"use client";
import { forwardRef, type InputHTMLAttributes } from "react";

export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  showValue?: boolean;
  formatValue?: (v: number) => string;
};

const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { showValue, formatValue, className, value, min = 0, max = 100, ...rest },
  ref,
) {
  const v = typeof value === "number" ? value : Number(value ?? min);
  const pct = ((v - Number(min)) / (Number(max) - Number(min))) * 100;
  return (
    <div
      className={["ui-slider", rest.disabled && "ui-slider--disabled", className].filter(Boolean).join(" ")}
      style={{ ["--ui-slider-pct" as string]: `${pct}%` }}
    >
      <input
        ref={ref}
        type="range"
        className="ui-slider-el"
        value={value}
        min={min}
        max={max}
        {...rest}
      />
      {showValue && <span className="ui-slider-val">{formatValue ? formatValue(v) : v}</span>}
    </div>
  );
});

export default Slider;
