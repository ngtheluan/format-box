// Kiểu dữ liệu + mặc định cho quiz và tem của Bảo tàng tri thức.
// Module thuần (không import server) để admin, API route và trang công khai dùng chung.

// exhibit: chỉ hỏi điều có trong hiện vật · topic: mở rộng ra chủ đề · mixed: cả hai.
export type DykQuizScope = "exhibit" | "topic" | "mixed";
export type DykStampStyle = "classic" | "arch" | "medallion" | "poster";
// Số câu đúng tối thiểu để nhận tem: ít nhất 1 câu / một nửa / tất cả.
export type DykStampPass = "any" | "half" | "all";

export type DykStampDesign = {
  style: DykStampStyle;
  // Khoá trong STAMP_COLORS, hoặc "auto" để chọn theo slug.
  color: string;
  // Dòng chữ nhỏ trên tem; trống → dùng tag của hiện vật.
  label_vi: string;
  label_en: string;
  // Ảnh in trên tem; trống → ảnh đầu tiên của hiện vật.
  image: string;
  pass: DykStampPass;
};

export type DykConfig = {
  quiz_count: number;
  quiz_scope: DykQuizScope;
  // Chạy thêm một lượt AI kiểm chứng dữ kiện và loại câu không chắc chắn.
  quiz_verify: boolean;
  stamp_style: DykStampStyle;
  stamp_color: string;
  stamp_pass: DykStampPass;
};

export const QUIZ_COUNT_MIN = 1;
export const QUIZ_COUNT_MAX = 10;

export const QUIZ_SCOPES: { value: DykQuizScope; label: string; hint: string }[] = [
  { value: "exhibit", label: "Bám hiện vật", hint: "Chỉ hỏi điều có trong mô tả và chú thích ảnh" },
  { value: "mixed", label: "Kết hợp", hint: "Một nửa bám hiện vật, một nửa mở rộng chủ đề" },
  { value: "topic", label: "Mở rộng chủ đề", hint: "Kiến thức liên quan, không cần có trong hiện vật" },
];

export const STAMP_STYLES: { value: DykStampStyle; label: string }[] = [
  { value: "classic", label: "Cổ điển" },
  { value: "arch", label: "Vòm cửa" },
  { value: "medallion", label: "Huy chương" },
  { value: "poster", label: "Áp phích" },
];

// Màu mực in trên nền giấy kem — đủ đậm để chữ nhỏ vẫn đọc được.
export const STAMP_COLORS: { value: string; label: string; ink: string }[] = [
  { value: "indigo", label: "Chàm", ink: "#2f3e8f" },
  { value: "crimson", label: "Đỏ son", ink: "#a3262f" },
  { value: "forest", label: "Lục rừng", ink: "#23603f" },
  { value: "ochre", label: "Vàng đất", ink: "#8f6210" },
  { value: "teal", label: "Xanh cổ vịt", ink: "#0f6b74" },
  { value: "plum", label: "Tím mận", ink: "#6d2a6f" },
  { value: "slate", label: "Xám đá", ink: "#3d4a5c" },
  { value: "rust", label: "Nâu gỉ", ink: "#a4491c" },
];

export const STAMP_PASSES: { value: DykStampPass; label: string }[] = [
  { value: "any", label: "Đúng ít nhất 1 câu" },
  { value: "half", label: "Đúng từ một nửa" },
  { value: "all", label: "Đúng tất cả" },
];

export const DEFAULT_DYK_CONFIG: DykConfig = {
  quiz_count: 3,
  quiz_scope: "mixed",
  quiz_verify: true,
  stamp_style: "classic",
  stamp_color: "auto",
  stamp_pass: "any",
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isStyle = (v: unknown): v is DykStampStyle => STAMP_STYLES.some((s) => s.value === v);
const isPass = (v: unknown): v is DykStampPass => STAMP_PASSES.some((s) => s.value === v);
const isScope = (v: unknown): v is DykQuizScope => QUIZ_SCOPES.some((s) => s.value === v);
const colorKey = (v: unknown) => (STAMP_COLORS.some((c) => c.value === v) ? (v as string) : "auto");

export function clampQuizCount(n: unknown, fallback = DEFAULT_DYK_CONFIG.quiz_count): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.max(QUIZ_COUNT_MIN, Math.min(QUIZ_COUNT_MAX, v));
}

export function normQuizScope(v: unknown, fallback: DykQuizScope = DEFAULT_DYK_CONFIG.quiz_scope): DykQuizScope {
  return isScope(v) ? v : fallback;
}

export function normDykConfig(x: unknown): DykConfig {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return {
    quiz_count: clampQuizCount(o.quiz_count),
    quiz_scope: normQuizScope(o.quiz_scope),
    quiz_verify: o.quiz_verify !== false,
    stamp_style: isStyle(o.stamp_style) ? o.stamp_style : DEFAULT_DYK_CONFIG.stamp_style,
    stamp_color: colorKey(o.stamp_color),
    stamp_pass: isPass(o.stamp_pass) ? o.stamp_pass : DEFAULT_DYK_CONFIG.stamp_pass,
  };
}

export function stampFromConfig(cfg: DykConfig): DykStampDesign {
  return {
    style: cfg.stamp_style,
    color: cfg.stamp_color,
    label_vi: "",
    label_en: "",
    image: "",
    pass: cfg.stamp_pass,
  };
}

// null khi hiện vật chưa có tem riêng (cột trống) → nơi gọi dùng mặc định chung.
export function normStamp(x: unknown): DykStampDesign | null {
  if (typeof x === "string") {
    try {
      x = JSON.parse(x);
    } catch {
      return null;
    }
  }
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  const image = str(o.image);
  return {
    style: isStyle(o.style) ? o.style : DEFAULT_DYK_CONFIG.stamp_style,
    color: colorKey(o.color),
    label_vi: str(o.label_vi).slice(0, 40),
    label_en: str(o.label_en).slice(0, 40),
    // Ảnh tem đi vào src, chỉ nhận http(s).
    image: /^https?:\/\//i.test(image) ? image : "",
    pass: isPass(o.pass) ? o.pass : DEFAULT_DYK_CONFIG.stamp_pass,
  };
}

export function stampNeeded(pass: DykStampPass, total: number): number {
  if (total <= 0) return 0;
  if (pass === "all") return total;
  if (pass === "half") return Math.ceil(total / 2);
  return 1;
}

// Màu mực của tem; "auto" chọn ổn định theo slug để mỗi hiện vật có màu riêng.
export function stampInk(color: string, seed: string): string {
  const found = STAMP_COLORS.find((c) => c.value === color);
  if (found) return found.ink;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return STAMP_COLORS[h % STAMP_COLORS.length].ink;
}
