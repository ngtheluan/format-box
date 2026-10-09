export type Region = "bac" | "trung" | "nam" | "tnguyen" | "special";

export type PlateEntry = {
  codes: string[];
  province: string;
  region: Region;
  aliases?: string[];
};

export const PLATES: PlateEntry[] = [
  { codes: ["11"], province: "Cao Bằng", region: "bac", aliases: ["cao bang"] },
  { codes: ["12"], province: "Lạng Sơn", region: "bac", aliases: ["lang son"] },
  { codes: ["14"], province: "Quảng Ninh", region: "bac", aliases: ["quang ninh", "ha long"] },
  { codes: ["15", "16"], province: "Hải Phòng", region: "bac", aliases: ["hai phong", "hp"] },
  { codes: ["17"], province: "Thái Bình", region: "bac", aliases: ["thai binh"] },
  { codes: ["18"], province: "Nam Định", region: "bac", aliases: ["nam dinh"] },
  { codes: ["19"], province: "Phú Thọ", region: "bac", aliases: ["phu tho", "viet tri"] },
  { codes: ["20"], province: "Thái Nguyên", region: "bac", aliases: ["thai nguyen"] },
  { codes: ["21"], province: "Yên Bái", region: "bac", aliases: ["yen bai"] },
  { codes: ["22"], province: "Tuyên Quang", region: "bac", aliases: ["tuyen quang"] },
  { codes: ["23"], province: "Hà Giang", region: "bac", aliases: ["ha giang"] },
  { codes: ["24"], province: "Lào Cai", region: "bac", aliases: ["lao cai", "sa pa", "sapa"] },
  { codes: ["25"], province: "Lai Châu", region: "bac", aliases: ["lai chau"] },
  { codes: ["26"], province: "Sơn La", region: "bac", aliases: ["son la"] },
  { codes: ["27"], province: "Điện Biên", region: "bac", aliases: ["dien bien"] },
  { codes: ["28"], province: "Hoà Bình", region: "bac", aliases: ["hoa binh", "hòa bình"] },
  {
    codes: ["29", "30", "31", "32", "33", "40"],
    province: "Hà Nội",
    region: "bac",
    aliases: ["ha noi", "hn", "hanoi", "capital", "thu do"],
  },
  { codes: ["34"], province: "Hải Dương", region: "bac", aliases: ["hai duong"] },
  { codes: ["35"], province: "Ninh Bình", region: "bac", aliases: ["ninh binh"] },
  { codes: ["36"], province: "Thanh Hoá", region: "trung", aliases: ["thanh hoa", "thanh hóa"] },
  { codes: ["37"], province: "Nghệ An", region: "trung", aliases: ["nghe an", "vinh"] },
  { codes: ["38"], province: "Hà Tĩnh", region: "trung", aliases: ["ha tinh"] },
  { codes: ["43"], province: "Đà Nẵng", region: "trung", aliases: ["da nang", "dn", "danang"] },
  { codes: ["47"], province: "Đắk Lắk", region: "tnguyen", aliases: ["dak lak", "dac lac", "buon ma thuot"] },
  { codes: ["48"], province: "Đắk Nông", region: "tnguyen", aliases: ["dak nong"] },
  { codes: ["49"], province: "Lâm Đồng", region: "tnguyen", aliases: ["lam dong", "da lat", "dalat"] },
  {
    codes: ["50", "51", "52", "53", "54", "55", "56", "57", "58", "59"],
    province: "TP. Hồ Chí Minh",
    region: "nam",
    aliases: ["ho chi minh", "hcm", "saigon", "sai gon", "sg", "tphcm"],
  },
  { codes: ["60"], province: "Đồng Nai", region: "nam", aliases: ["dong nai", "bien hoa"] },
  { codes: ["61"], province: "Bình Dương", region: "nam", aliases: ["binh duong", "thu dau mot"] },
  { codes: ["62"], province: "Long An", region: "nam", aliases: ["long an"] },
  { codes: ["63"], province: "Tiền Giang", region: "nam", aliases: ["tien giang", "my tho"] },
  { codes: ["64"], province: "Vĩnh Long", region: "nam", aliases: ["vinh long"] },
  { codes: ["65"], province: "Cần Thơ", region: "nam", aliases: ["can tho", "ct"] },
  { codes: ["66"], province: "Đồng Tháp", region: "nam", aliases: ["dong thap"] },
  { codes: ["67"], province: "An Giang", region: "nam", aliases: ["an giang", "long xuyen"] },
  { codes: ["68"], province: "Kiên Giang", region: "nam", aliases: ["kien giang", "phu quoc", "rach gia"] },
  { codes: ["69"], province: "Cà Mau", region: "nam", aliases: ["ca mau"] },
  { codes: ["70"], province: "Tây Ninh", region: "nam", aliases: ["tay ninh"] },
  { codes: ["71"], province: "Bến Tre", region: "nam", aliases: ["ben tre"] },
  { codes: ["72"], province: "Bà Rịa - Vũng Tàu", region: "nam", aliases: ["ba ria", "vung tau", "brvt"] },
  { codes: ["73"], province: "Quảng Bình", region: "trung", aliases: ["quang binh", "dong hoi"] },
  { codes: ["74"], province: "Quảng Trị", region: "trung", aliases: ["quang tri"] },
  { codes: ["75"], province: "Thừa Thiên Huế", region: "trung", aliases: ["thua thien hue", "hue"] },
  { codes: ["76"], province: "Quảng Ngãi", region: "trung", aliases: ["quang ngai"] },
  { codes: ["77"], province: "Bình Định", region: "trung", aliases: ["binh dinh", "quy nhon"] },
  { codes: ["78"], province: "Phú Yên", region: "trung", aliases: ["phu yen", "tuy hoa"] },
  { codes: ["79"], province: "Khánh Hoà", region: "trung", aliases: ["khanh hoa", "khánh hòa", "nha trang"] },
  { codes: ["81"], province: "Gia Lai", region: "tnguyen", aliases: ["gia lai", "pleiku"] },
  { codes: ["82"], province: "Kon Tum", region: "tnguyen", aliases: ["kon tum"] },
  { codes: ["83"], province: "Sóc Trăng", region: "nam", aliases: ["soc trang"] },
  { codes: ["84"], province: "Trà Vinh", region: "nam", aliases: ["tra vinh"] },
  { codes: ["85"], province: "Ninh Thuận", region: "trung", aliases: ["ninh thuan", "phan rang"] },
  { codes: ["86"], province: "Bình Thuận", region: "trung", aliases: ["binh thuan", "phan thiet", "mui ne"] },
  { codes: ["88"], province: "Vĩnh Phúc", region: "bac", aliases: ["vinh phuc"] },
  { codes: ["89"], province: "Hưng Yên", region: "bac", aliases: ["hung yen"] },
  { codes: ["90"], province: "Hà Nam", region: "bac", aliases: ["ha nam", "phu ly"] },
  { codes: ["92"], province: "Quảng Nam", region: "trung", aliases: ["quang nam", "tam ky", "hoi an"] },
  { codes: ["93"], province: "Bình Phước", region: "nam", aliases: ["binh phuoc", "dong xoai"] },
  { codes: ["94"], province: "Bạc Liêu", region: "nam", aliases: ["bac lieu"] },
  { codes: ["95"], province: "Hậu Giang", region: "nam", aliases: ["hau giang"] },
  { codes: ["97"], province: "Bắc Kạn", region: "bac", aliases: ["bac kan"] },
  { codes: ["98"], province: "Bắc Giang", region: "bac", aliases: ["bac giang"] },
  { codes: ["99"], province: "Bắc Ninh", region: "bac", aliases: ["bac ninh"] },
  { codes: ["80"], province: "Cơ quan Trung ương", region: "special", aliases: ["trung uong", "chinh phu", "central"] },
  { codes: ["NG", "NN", "QT"], province: "Ngoại giao / Nước ngoài / Quốc tế", region: "special", aliases: ["ngoai giao", "nuoc ngoai", "quoc te", "diplomatic"] },
  { codes: ["KT"], province: "Doanh nghiệp Quân đội", region: "special", aliases: ["kinh te", "quan doi"] },
  { codes: ["LD"], province: "Xe liên doanh", region: "special", aliases: ["lien doanh"] },
  { codes: ["R"], province: "Rơ-moóc", region: "special", aliases: ["ro mooc", "romooc", "trailer"] },
];

export const REGION_LABEL: Record<Region, { vi: string; en: string }> = {
  bac: { vi: "Miền Bắc", en: "North" },
  trung: { vi: "Miền Trung", en: "Central" },
  tnguyen: { vi: "Tây Nguyên", en: "Highlands" },
  nam: { vi: "Miền Nam", en: "South" },
  special: { vi: "Đặc biệt", en: "Special" },
};

export const REGION_COLOR: Record<Region, string> = {
  bac: "#60a5fa",
  trung: "#fbbf24",
  tnguyen: "#34d399",
  nam: "#fb7185",
  special: "#a78bfa",
};

export function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function extractCode(raw: string): string | null {
  const s = raw.replace(/\s|[-.]/g, "").toUpperCase();
  const specials = ["NG", "NN", "QT", "KT", "LD"];
  for (const p of specials) if (s.startsWith(p)) return p;
  if (/^R\d/.test(s)) return "R";
  const m = /^(\d{2})/.exec(s);
  return m ? m[1] : null;
}

export type Parsed = {
  code: string;           // mã tỉnh / mã đặc biệt
  series: string | null;  // letter hoặc letter+digit (A, K, X1, B1...)
  serial: string | null;  // phần số đuôi
  kind: "car" | "moto" | "trailer" | "diplomatic" | "joint" | "military-econ" | "state" | "unknown";
  plateColor: "white" | "yellow" | "blue" | "red" | "unknown";
};

// Phân tích biển số theo định dạng hiện hành (2008+).
// Ô tô: 2 chữ số + 1 chữ cái + 4–5 số     (vd 51K-12345, 29A-12345)
// Xe máy: 2 chữ số + 1 chữ cái + 1 số + 4–5 số (vd 59X1-23456)
// Đặc biệt: NG/NN/QT/KT/LD/R + số
export function parsePlate(raw: string): Parsed | null {
  const s = raw.replace(/\s|[-.·]/g, "").toUpperCase();
  if (!s) return null;

  // Đặc biệt dạng chữ
  const special = /^(NG|NN|QT|KT|LD)(\d+)$/.exec(s);
  if (special) {
    const code = special[1];
    const kind: Parsed["kind"] =
      code === "NG" || code === "NN" || code === "QT"
        ? "diplomatic"
        : code === "LD"
        ? "joint"
        : "military-econ";
    return {
      code,
      series: null,
      serial: special[2],
      kind,
      plateColor: kind === "diplomatic" ? "white" : "white",
    };
  }

  // Rơ-moóc
  const trailer = /^R(\d+)$/.exec(s);
  if (trailer) {
    return { code: "R", series: null, serial: trailer[1], kind: "trailer", plateColor: "white" };
  }

  // Mã 80 (trung ương, biển xanh)
  const state = /^80([A-Z])(\d{3,5})$/.exec(s);
  if (state) {
    return { code: "80", series: state[1], serial: state[2], kind: "state", plateColor: "blue" };
  }

  // Xe máy: 2 số + chữ + số + 4–5 số
  const moto = /^(\d{2})([A-Z])(\d)(\d{4,5})$/.exec(s);
  if (moto) {
    return {
      code: moto[1],
      series: moto[2] + moto[3],
      serial: moto[4],
      kind: "moto",
      plateColor: "white",
    };
  }

  // Ô tô: 2 số + chữ + 4–5 số
  const car = /^(\d{2})([A-Z])(\d{4,5})$/.exec(s);
  if (car) {
    return {
      code: car[1],
      series: car[2],
      serial: car[3],
      kind: "car",
      plateColor: "white",
    };
  }

  // Chỉ có mã tỉnh
  const only = /^(\d{2})$/.exec(s);
  if (only) {
    return { code: only[1], series: null, serial: null, kind: "unknown", plateColor: "unknown" };
  }

  return null;
}

export const PLATE_COLOR_HEX: Record<Parsed["plateColor"], { bg: string; text: string }> = {
  white: { bg: "#fde68a", text: "#111" }, // vàng ngà biển dân sự truyền thống
  yellow: { bg: "#facc15", text: "#111" },
  blue: { bg: "#1d4ed8", text: "#fff" },
  red: { bg: "#dc2626", text: "#fff" },
  unknown: { bg: "#e5e7eb", text: "#111" },
};

export const KIND_LABEL: Record<Parsed["kind"], { vi: string; en: string }> = {
  car: { vi: "Ô tô", en: "Car" },
  moto: { vi: "Xe máy", en: "Motorbike" },
  trailer: { vi: "Rơ-moóc", en: "Trailer" },
  diplomatic: { vi: "Ngoại giao", en: "Diplomatic" },
  joint: { vi: "Xe liên doanh", en: "Joint venture" },
  "military-econ": { vi: "Doanh nghiệp Quân đội", en: "Military enterprise" },
  state: { vi: "Cơ quan Nhà nước", en: "State agency" },
  unknown: { vi: "Chưa rõ", en: "Unknown" },
};
