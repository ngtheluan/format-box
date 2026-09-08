export type CurrencyCode = string;

export type Currency = {
  code: CurrencyCode;
  name: { vi: string; en: string };
  symbol: string;
  flag: string; // ISO country code (lowercase) — used for flag lookup, NOT emoji
};

export const CURRENCIES: Currency[] = [
  { code: "USD", name: { vi: "Đô la Mỹ", en: "US Dollar" }, symbol: "$", flag: "us" },
  { code: "VND", name: { vi: "Việt Nam Đồng", en: "Vietnamese Dong" }, symbol: "₫", flag: "vn" },
  { code: "EUR", name: { vi: "Euro", en: "Euro" }, symbol: "€", flag: "eu" },
  { code: "GBP", name: { vi: "Bảng Anh", en: "British Pound" }, symbol: "£", flag: "gb" },
  { code: "JPY", name: { vi: "Yên Nhật", en: "Japanese Yen" }, symbol: "¥", flag: "jp" },
  { code: "CNY", name: { vi: "Nhân dân tệ", en: "Chinese Yuan" }, symbol: "¥", flag: "cn" },
  { code: "KRW", name: { vi: "Won Hàn Quốc", en: "Korean Won" }, symbol: "₩", flag: "kr" },
  { code: "SGD", name: { vi: "Đô la Singapore", en: "Singapore Dollar" }, symbol: "$", flag: "sg" },
  { code: "THB", name: { vi: "Baht Thái", en: "Thai Baht" }, symbol: "฿", flag: "th" },
  { code: "AUD", name: { vi: "Đô la Úc", en: "Australian Dollar" }, symbol: "$", flag: "au" },
  { code: "CAD", name: { vi: "Đô la Canada", en: "Canadian Dollar" }, symbol: "$", flag: "ca" },
  { code: "CHF", name: { vi: "Franc Thụy Sĩ", en: "Swiss Franc" }, symbol: "₣", flag: "ch" },
  { code: "HKD", name: { vi: "Đô la Hồng Kông", en: "Hong Kong Dollar" }, symbol: "$", flag: "hk" },
  { code: "TWD", name: { vi: "Đài tệ", en: "Taiwan Dollar" }, symbol: "$", flag: "tw" },
  { code: "MYR", name: { vi: "Ringgit Malaysia", en: "Malaysian Ringgit" }, symbol: "RM", flag: "my" },
  { code: "IDR", name: { vi: "Rupiah Indonesia", en: "Indonesian Rupiah" }, symbol: "Rp", flag: "id" },
  { code: "PHP", name: { vi: "Peso Philippines", en: "Philippine Peso" }, symbol: "₱", flag: "ph" },
  { code: "INR", name: { vi: "Rupee Ấn Độ", en: "Indian Rupee" }, symbol: "₹", flag: "in" },
  { code: "RUB", name: { vi: "Rúp Nga", en: "Russian Ruble" }, symbol: "₽", flag: "ru" },
  { code: "AED", name: { vi: "Dirham UAE", en: "UAE Dirham" }, symbol: "د.إ", flag: "ae" },
  { code: "NZD", name: { vi: "Đô la New Zealand", en: "New Zealand Dollar" }, symbol: "$", flag: "nz" },
  { code: "SEK", name: { vi: "Krona Thụy Điển", en: "Swedish Krona" }, symbol: "kr", flag: "se" },
  { code: "NOK", name: { vi: "Krone Na Uy", en: "Norwegian Krone" }, symbol: "kr", flag: "no" },
  { code: "DKK", name: { vi: "Krone Đan Mạch", en: "Danish Krone" }, symbol: "kr", flag: "dk" },
];

export const CURRENCY_MAP = new Map(CURRENCIES.map((c) => [c.code, c]));

export type ExchangeSnapshot = {
  source: "open-er-api" | "fallback";
  base: CurrencyCode;
  updatedAt: string; // ISO
  fetchedAt: string; // ISO
  rates: Record<CurrencyCode, number>;
  note?: string;
};

export const FALLBACK_SNAPSHOT: ExchangeSnapshot = {
  source: "fallback",
  base: "USD",
  updatedAt: "2026-01-01T00:00:00Z",
  fetchedAt: "2026-01-01T00:00:00Z",
  note: "Không lấy được dữ liệu live — dùng tỉ giá tham khảo.",
  rates: {
    USD: 0,
    VND: 0,
    EUR: 0,
    GBP: 0,
    JPY: 0,
    CNY: 0,
    KRW: 0,
    SGD: 0,
    THB: 0,
    AUD: 0,
    CAD: 0,
    CHF: 0,
    HKD: 0,
    TWD: 0,
    MYR: 0,
    IDR: 0,
    PHP: 0,
    INR: 0,
    RUB: 0,
    AED: 0,
    NZD: 0,
    SEK: 0,
    NOK: 0,
    DKK: 0,
  },
};

export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<CurrencyCode, number>,
): number | null {
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;
  const amountInBase = amount / fromRate;
  return amountInBase * toRate;
}

export function crossRate(from: CurrencyCode, to: CurrencyCode, rates: Record<CurrencyCode, number>): number | null {
  return convert(1, from, to, rates);
}

export function fmtAmount(n: number, code: CurrencyCode): string {
  if (!Number.isFinite(n)) return "—";
  if (code === "VND" || code === "KRW" || code === "IDR" || code === "JPY") {
    return n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
  }
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: n >= 1 ? 2 : 6,
  });
}

export function fmtRate(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}
