"use client";
import type { HTMLAttributes, ReactNode } from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconPoint,
  IconX,
} from "@tabler/icons-react";

export type AlertTone = "info" | "success" | "warning" | "danger" | "neutral";

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
  title?: ReactNode;
  icon?: ReactNode;
  onClose?: () => void;
  children?: ReactNode;
};

const DEFAULT_ICONS: Record<AlertTone, ReactNode> = {
  info: <IconInfoCircle size={14} stroke={2} />,
  success: <IconCheck size={14} stroke={2.4} />,
  warning: <IconAlertTriangle size={14} stroke={2} />,
  danger: <IconX size={14} stroke={2.4} />,
  neutral: <IconPoint size={14} stroke={2} />,
};

export default function Alert({ tone = "info", title, icon, onClose, className, children, ...rest }: AlertProps) {
  return (
    <div className={["ui-alert", `ui-alert--${tone}`, className].filter(Boolean).join(" ")} role="status" {...rest}>
      <span className="ui-alert-ic" aria-hidden="true">
        {icon ?? DEFAULT_ICONS[tone]}
      </span>
      <div className="ui-alert-body">
        {title && <div className="ui-alert-title">{title}</div>}
        {children && <div className="ui-alert-text">{children}</div>}
      </div>
      {onClose && (
        <button className="ui-alert-x" aria-label="Dismiss" onClick={onClose}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
