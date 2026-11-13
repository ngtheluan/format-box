// Tem bộ sưu tập của người xem — chỉ lưu trong localStorage, không gửi server.
// Người xem vượt qua quiz một hiện vật → nhận 1 tem; chơi lại giữ score cao nhất.

import { useSyncExternalStore } from "react";
import type { DykStampStyle } from "./dyk-shared";

export type DykStamp = {
  slug: string;
  title: string;
  tag: string;
  image: string;
  score: number;
  total: number;
  earnedAt: number;
  // Bản chụp thiết kế lúc nhận tem — tem cũ (trước khi có cấu hình) không có các trường này.
  no?: string;
  style?: DykStampStyle;
  color?: string;
  label?: string;
};

const KEY = "fb-dyk-stamps";
export const STAMPS_EVENT = "fb-dyk-stamps-changed";

function safeRead(): DykStamp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DykStamp[]).filter((s) => s && typeof s.slug === "string") : [];
  } catch {
    return [];
  }
}

function safeWrite(list: DykStamp[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(STAMPS_EVENT));
  } catch {
    /* quota full or storage disabled — tem là tính năng vui, bỏ qua lỗi */
  }
}

export function getStamps(): DykStamp[] {
  return safeRead().sort((a, b) => b.earnedAt - a.earnedAt);
}

export function getStamp(slug: string): DykStamp | null {
  return safeRead().find((s) => s.slug === slug) ?? null;
}

// Dọn tem của hiện vật đã bị gỡ: chỉ giữ lại slug còn trong `validSlugs`.
// Gọi khi /blog có danh sách mới để tem trong bảo tàng không "mồ côi".
export function pruneStamps(validSlugs: Iterable<string>): void {
  const keep = new Set(validSlugs);
  const list = safeRead();
  const next = list.filter((s) => keep.has(s.slug));
  if (next.length !== list.length) safeWrite(next);
}

// Giữ lần chơi tốt nhất; chỉ cập nhật khi tỉ lệ đúng mới cao hơn (số câu của
// một hiện vật có thể thay đổi khi admin sửa quiz, nên so theo tỉ lệ).
export function awardStamp(next: DykStamp): { saved: boolean; isNew: boolean; best: DykStamp } {
  const list = safeRead();
  const idx = list.findIndex((s) => s.slug === next.slug);
  if (idx < 0) {
    list.push(next);
    safeWrite(list);
    return { saved: true, isNew: true, best: next };
  }
  const prev = list[idx];
  const ratio = (s: DykStamp) => (s.total > 0 ? s.score / s.total : 0);
  if (ratio(next) > ratio(prev)) {
    list[idx] = { ...prev, ...next };
    safeWrite(list);
    return { saved: true, isNew: false, best: list[idx] };
  }
  return { saved: false, isNew: false, best: prev };
}

// ---------- React: danh sách tem luôn khớp localStorage (cả tab khác) ----------
const EMPTY: DykStamp[] = [];
let cachedRaw: string | null = null;
let cachedList = EMPTY;

function snapshot(): DykStamp[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = raw ? getStamps() : EMPTY;
  }
  return cachedList;
}

function subscribe(onChange: () => void) {
  window.addEventListener(STAMPS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(STAMPS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useDykStamps(): DykStamp[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
