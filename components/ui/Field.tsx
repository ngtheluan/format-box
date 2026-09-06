"use client";
import type { ReactNode } from "react";

export type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

export default function Field({ label, hint, error, required, htmlFor, className, children }: FieldProps) {
  return (
    <div className={`ui-field${error ? " ui-field--error" : ""}${className ? ` ${className}` : ""}`}>
      {label && (
        <label className="ui-field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ui-field-req">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="ui-field-msg ui-field-msg--error">{error}</div>
      ) : hint ? (
        <div className="ui-field-msg">{hint}</div>
      ) : null}
    </div>
  );
}
