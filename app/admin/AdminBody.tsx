"use client";
import type { CSSProperties, ReactNode } from "react";
import AdminHeader, { type AdminCrumb } from "./AdminHeader";
import "./admin.css";

export type AdminBodyProps = {
  // Header
  crumbs?: AdminCrumb[];
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  headerActions?: ReactNode;
  showLogout?: boolean;
  onLogout?: () => void;

  // Between header and body (full-width strips)
  stats?: ReactNode; // items inside <div className="fx-stats">
  tabs?: ReactNode;  // items inside <div className="fx-tabs">

  // Body
  title?: ReactNode;
  description?: ReactNode;
  titleActions?: ReactNode;
  bodyStyle?: CSSProperties;
  children: ReactNode;
};

export default function AdminBody({
  crumbs,
  search,
  headerActions,
  showLogout = true,
  onLogout,
  stats,
  tabs,
  title,
  description,
  titleActions,
  bodyStyle,
  children,
}: AdminBodyProps) {
  return (
    <div className="fx-scope fx-shell">
      <AdminHeader
        crumbs={crumbs}
        search={search}
        actions={headerActions}
        showLogout={showLogout}
        onLogout={onLogout}
      />

      {stats && <div className="fx-stats">{stats}</div>}
      {tabs && <div className="fx-tabs">{tabs}</div>}

      <div className="fx-body" style={bodyStyle}>
        {(title || description || titleActions) && (
          <div className="fx-page-head">
            <div>
              {title && <h1 className="fx-page-title">{title}</h1>}
              {description && <p className="fx-page-desc">{description}</p>}
            </div>
            {titleActions && <div className="fx-page-actions">{titleActions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
