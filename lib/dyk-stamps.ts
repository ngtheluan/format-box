// Tem bộ sưu tập của người xem — chỉ lưu trong localStorage, không gửi server.
// Người xem hoàn thành quiz một hiện vật → nhận 1 tem; chơi lại giữ score cao nhất.

export type DykStamp = {
  slug: string;
  title: string;
  tag: string;
  image: string;
  score: number;
  total: number;
  earnedAt: number;
};

const KEY = "fb-dyk-stamps";

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
    window.dispatchEvent(new CustomEvent("fb-dyk-stamps-changed"));
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

// Giữ lần chơi tốt nhất; chỉ cập nhật khi score mới cao hơn.
export function awardStamp(next: DykStamp): { saved: boolean; isNew: boolean; best: DykStamp } {
  const list = safeRead();
  const idx = list.findIndex((s) => s.slug === next.slug);
  if (idx < 0) {
    list.push(next);
    safeWrite(list);
    return { saved: true, isNew: true, best: next };
  }
  const prev = list[idx];
  if (next.score > prev.score) {
    list[idx] = { ...prev, ...next };
    safeWrite(list);
    return { saved: true, isNew: false, best: list[idx] };
  }
  return { saved: false, isNew: false, best: prev };
}
