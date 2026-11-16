import type { BlogPost, BlogStatus } from "@/lib/blog";
import type { GenStep } from "@/lib/blog-ai-shared";
import {
  IconCheck,
  IconRotateClockwise,
  IconTextGrammar,
  IconTrash,
  IconViewportNarrow,
  IconViewportWide,
  IconWand,
  IconX,
} from "@tabler/icons-react";

export type StepState = {
  status: "pending" | "start" | "done" | "skip";
  detail?: string;
  startedAt?: number;
  durationMs?: number;
};

export const STEP_LABEL: Record<GenStep, string> = {
  topic: "AI chọn chủ đề",
  research: "Tra cứu web",
  outline: "Lập dàn ý",
  write: "Viết bài",
  factcheck: "Kiểm chứng dữ kiện",
  linking: "Chèn liên kết nội bộ",
  images: "Tìm & duyệt ảnh liên quan",
  video: "Tìm video YouTube liên quan",
  save: "Lưu nháp",
};

export type AssistAction = "rewrite" | "expand" | "shorten" | "polish";
export const ASSIST: { id: AssistAction; label: string; icon: JSX.Element }[] = [
  { id: "rewrite", label: "Viết lại", icon: <IconWand size={13} stroke={1.9} /> },
  { id: "expand", label: "Mở rộng", icon: <IconViewportWide size={13} stroke={1.9} /> },
  { id: "shorten", label: "Rút gọn", icon: <IconViewportNarrow size={13} stroke={1.9} /> },
  { id: "polish", label: "Trau chuốt", icon: <IconTextGrammar size={13} stroke={1.9} /> },
];

// Picker needs English keywords: prefer ASCII-only tags, else the de-accented title.
export function photoQuery(title: string, tags: string[]) {
  const t = tags.filter((x) => /^[\x20-\x7e]+$/.test(x));
  const ascii = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d");
  return (t.length ? t.slice(0, 3).join(" ") : ascii.split(/\s+/).slice(0, 4).join(" ")).toLowerCase();
}

export type StatusFilter = "all" | BlogStatus;

// Lists in the Posts / Series / Knowledge tabs paginate past this many items.
export const PAGE_SIZE = 20;
export const pageOf = <T,>(items: T[], page: number) => {
  const count = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const cur = Math.min(Math.max(1, page), count); // clamp after deletes/filtering
  return { cur, items: items.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE) };
};

// Search ignores case and Vietnamese diacritics ("tim" finds "Tìm").
export const foldText = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
export const matchesQuery = (needle: string, fields: (string | undefined | null)[]) =>
  !needle || fields.some((f) => !!f && foldText(f).includes(needle));

export const postTime = (p: BlogPost) => Date.parse(p.createdAt || p.date) || 0;

// dd/mm/yy hh:mm in a fixed timezone, so the server render and the browser agree.
export const POST_TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function fmtPostTime(p: BlogPost): string {
  const t = postTime(p);
  if (!t) return p.date;
  const v = Object.fromEntries(POST_TIME_FMT.formatToParts(t).map((x) => [x.type, x.value]));
  const day = `${v.day}/${v.month}/${v.year}`;
  return p.createdAt ? `${day} ${v.hour}:${v.minute}` : day;
}

export const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "Nháp",
  rejected: "Từ chối",
  published: "Phát hành",
};

// Bulk actions on selected posts — same endpoints as the per-row Actions column.
export type BulkAction = "approve" | "reject" | "unpublish" | "delete";
export const BULK_ACTIONS: Record<
  BulkAction,
  { label: string; doneLabel: string; endpoint: string; next?: BlogStatus; color: string; icon: typeof IconCheck }
> = {
  approve: {
    label: "Duyệt",
    doneLabel: "Đã duyệt",
    endpoint: "/api/blog/approve",
    next: "published",
    color: "var(--ok, #10b981)",
    icon: IconCheck,
  },
  reject: {
    label: "Từ chối",
    doneLabel: "Đã từ chối",
    endpoint: "/api/blog/reject",
    next: "rejected",
    color: "var(--warn, #f59e0b)",
    icon: IconX,
  },
  unpublish: {
    label: "Về nháp",
    doneLabel: "Đã chuyển về nháp",
    endpoint: "/api/blog/unpublish",
    next: "draft",
    color: "var(--info, #3b82f6)",
    icon: IconRotateClockwise,
  },
  delete: {
    label: "Xoá",
    doneLabel: "Đã xoá",
    endpoint: "/api/blog/delete",
    color: "var(--err, #ef4444)",
    icon: IconTrash,
  },
};
