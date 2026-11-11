"use client";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { HTMLAttributes } from "react";

export type PaginationProps = Omit<HTMLAttributes<HTMLElement>, "onChange"> & {
  page: number; // 1-based
  total: number; // item count
  pageSize: number;
  onChange: (page: number) => void;
  // Pages shown on each side of the current one before collapsing into "…".
  siblings?: number;
  prevLabel?: string;
  nextLabel?: string;
};

type Slot = number | "gap-l" | "gap-r";

function slots(page: number, count: number, siblings: number): Slot[] {
  const first = Math.max(2, page - siblings);
  const last = Math.min(count - 1, page + siblings);
  const out: Slot[] = [1];
  if (first > 2) out.push("gap-l");
  for (let i = first; i <= last; i++) out.push(i);
  if (last < count - 1) out.push("gap-r");
  if (count > 1) out.push(count);
  return out;
}

export default function Pagination({
  page,
  total,
  pageSize,
  onChange,
  siblings = 1,
  prevLabel = "Previous page",
  nextLabel = "Next page",
  className,
  ...rest
}: PaginationProps) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(Math.max(1, page), count);
  const from = total ? (cur - 1) * pageSize + 1 : 0;
  const to = Math.min(total, cur * pageSize);
  const go = (p: number) => {
    if (p >= 1 && p <= count && p !== cur) onChange(p);
  };

  return (
    <nav className={["ui-pager", className].filter(Boolean).join(" ")} {...rest}>
      <span className="ui-pager-info">
        {from}–{to} / {total}
      </span>
      <div className="ui-pager-pages">
        <button
          type="button"
          className="ui-pager-btn"
          onClick={() => go(cur - 1)}
          disabled={cur <= 1}
          aria-label={prevLabel}
          title={prevLabel}
        >
          <IconChevronLeft size={14} stroke={2} />
        </button>
        {slots(cur, count, siblings).map((s) =>
          typeof s === "number" ? (
            <button
              key={s}
              type="button"
              className="ui-pager-btn"
              data-active={s === cur || undefined}
              aria-current={s === cur ? "page" : undefined}
              onClick={() => go(s)}
            >
              {s}
            </button>
          ) : (
            <span key={s} className="ui-pager-gap" aria-hidden="true">
              …
            </span>
          ),
        )}
        <button
          type="button"
          className="ui-pager-btn"
          onClick={() => go(cur + 1)}
          disabled={cur >= count}
          aria-label={nextLabel}
          title={nextLabel}
        >
          <IconChevronRight size={14} stroke={2} />
        </button>
      </div>
    </nav>
  );
}
