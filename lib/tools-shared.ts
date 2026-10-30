import type { Metadata } from "next";
import type { Lang } from "./i18n";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://formatbox.site").replace(/\/$/, "");

type Bilingual = { vi: string; en: string };
type BilingualList = { vi: string[]; en: string[] };
export type FaqItem = { q: string; a: string };
export type BilingualFaqs = { vi: FaqItem[]; en: FaqItem[] };

export type ToolCategory = "cat_text" | "cat_media" | "cat_dev" | "cat_life";

export type Tool = {
  href: string;
  iconName: string;
  title: string;
  desc: Bilingual;
  tags: string[];
  category: ToolCategory;
  sort?: number;
  active?: boolean;
  visibleGuest?: boolean;
  visibleUser?: boolean;
  // SEO content for the tool landing page
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  intro?: Bilingual;
  features?: BilingualList;
  faqs?: BilingualFaqs;
};

export type Role = "guest" | "user" | "admin" | "superadmin";

export function isToolVisible(t: Pick<Tool, "active" | "visibleGuest" | "visibleUser">, role: Role): boolean {
  if (role === "admin" || role === "superadmin") return true;
  if ((t.active ?? true) === false) return false;
  if (role === "user") return t.visibleUser ?? true;
  return t.visibleGuest ?? true;
}

export const CATEGORY_ORDER: ToolCategory[] = ["cat_text", "cat_media", "cat_dev", "cat_life"];

export const toolDesc = (t: Tool, lang: Lang) => t.desc[lang];

export const toolSearchable = (t: Tool) =>
  [t.title, t.desc.vi, t.desc.en, t.href, ...t.tags].join(" ").toLowerCase();

// Curated keyword → tool map for the in-article "Công cụ liên quan" block.
// Each tool lists strong, intent-revealing phrases (Vietnamese + English). A
// blog post suggests a tool only when one of its phrases appears in the post's
// tags/title — so a post gets a tool only on a real topical signal, and the
// many posts with no matching intent (cooking, health, plants…) show nothing.
// Phrases are matched as lowercase, accent-sensitive substrings; prefer
// multi-word or distinctive phrases to avoid incidental hits.
const TOOL_KEYWORDS: { href: string; phrases: string[] }[] = [
  { href: "/json", phrases: ["json"] },
  { href: "/base64", phrases: ["base64"] },
  { href: "/jwt", phrases: ["jwt"] },
  { href: "/regex", phrases: ["regex", "regexp", "biểu thức chính quy"] },
  { href: "/uuid", phrases: ["uuid"] },
  { href: "/markdown", phrases: ["markdown"] },
  { href: "/text-case", phrases: ["camelcase", "snake_case", "kebab-case"] },
  { href: "/timestamp", phrases: ["unix timestamp", "epoch"] },
  { href: "/curl", phrases: ["curl"] },
  { href: "/responsive", phrases: ["responsive"] },
  {
    href: "/color",
    phrases: ["màu sắc", "bảng màu", "mã màu", "color palette", "hex color", "contrast", "wcag", "oklch"],
  },
  { href: "/image", phrases: ["chuyển đổi ảnh", "nén ảnh", "webp", "chuyển ảnh"] },
  { href: "/favicon-export", phrases: ["favicon"] },
  { href: "/qr", phrases: ["mã qr", "qr code", "qrcode"] },
  { href: "/audio-studio", phrases: ["cắt nhạc", "ghép nhạc", "chỉnh audio", "cắt file mp3"] },
  { href: "/bill", phrases: ["chia hóa đơn", "chia tiền", "split bill"] },
  { href: "/exchange-currency", phrases: ["tỷ giá", "đổi tiền", "chuyển đổi tiền tệ", "exchange rate", "currency"] },
  { href: "/gold", phrases: ["giá vàng", "vàng sjc", "vàng pnj"] },
  { href: "/fuel", phrases: ["giá xăng", "xăng dầu"] },
  { href: "/weather", phrases: ["thời tiết", "dự báo thời tiết"] },
  { href: "/calendar", phrases: ["âm lịch", "lịch âm", "dương lịch", "lịch vạn niên"] },
  { href: "/countdown", phrases: ["đếm ngược", "countdown"] },
  { href: "/speed-test", phrases: ["tốc độ mạng", "speed test", "tốc độ wifi", "tốc độ internet"] },
  { href: "/typing-test", phrases: ["gõ phím", "luyện gõ", "typing test"] },
  { href: "/lucky-ticket", phrases: ["xổ số", "dò vé số", "dò số"] },
  { href: "/wheel", phrases: ["vòng quay may mắn", "quay số ngẫu nhiên", "random picker"] },
  { href: "/meme", phrases: ["chế meme", "tạo meme"] },
  { href: "/travel-plan", phrases: ["du lịch", "lịch trình", "phượt", "check-in", "điểm đến"] },
  { href: "/license-plate", phrases: ["biển số xe", "bấm biển số"] },
];

// Suggest tools genuinely related to a blog post, via the curated map above.
// Returns [] when no phrase matches so the UI hides the block entirely.
export function relatedTools(tools: Tool[], post: { title: string; tags: string[] }, limit = 3): Tool[] {
  const haystack = [...post.tags, post.title].join(" ").toLowerCase();
  const byHref = new Map(tools.filter((t) => (t.active ?? true) !== false).map((t) => [t.href, t]));
  const out: Tool[] = [];
  for (const { href, phrases } of TOOL_KEYWORDS) {
    if (out.length >= limit) break;
    const tool = byHref.get(href);
    if (!tool) continue;
    if (phrases.some((p) => haystack.includes(p))) out.push(tool);
  }
  return out;
}

export const emptyBilingual = (): Bilingual => ({ vi: "", en: "" });
export const emptyBilingualList = (): BilingualList => ({ vi: [], en: [] });
export const emptyBilingualFaqs = (): BilingualFaqs => ({ vi: [], en: [] });

// Seed data — the canonical menu, used to bootstrap Supabase and as a fallback
// when the database is unreachable. Each entry carries both the menu metadata
// and the SEO content shown on the tool landing page.
export const SEED_TOOLS: Tool[] = [
  {
    href: "/base64",
    iconName: "IconLock",
    title: "Base64",
    desc: { vi: "Text, file, UTF-8 đầy đủ. Kéo thả, đổi chiều một chạm.", en: "Text, files, full UTF-8. Drag-drop and swap in one click." },
    tags: ["text", "file", "utf-8"],
    category: "cat_text",
    seoTitle: "Base64 Encode & Decode Online - Text, File, UTF-8 | FormatBox",
    seoDescription: "Mã hóa và giải mã Base64 online miễn phí. Hỗ trợ text, file nhị phân, UTF-8 đầy đủ. Kéo thả file, đổi chiều một chạm. Xử lý 100% trên trình duyệt.",
    seoKeywords: ["base64", "base64 encode", "base64 decode", "mã hóa base64", "giải mã base64", "base64 online", "base64 to text", "base64 to file", "base64 image"],
    intro: {
      vi: "Base64 là chuẩn mã hóa chuyển dữ liệu nhị phân thành chuỗi ký tự ASCII, thường dùng để nhúng ảnh vào HTML/CSS, truyền file qua JSON API, hoặc lưu trong URL. Tool của FormatBox hỗ trợ encode/decode cả text và file (kéo thả), xử lý UTF-8 chính xác, chạy hoàn toàn offline.",
      en: "Base64 is an encoding standard that converts binary data into ASCII strings — commonly used for embedding images in HTML/CSS, carrying files over JSON APIs, or storing them in URLs. FormatBox supports encode/decode of both text and files (drag & drop), handles UTF-8 correctly, and runs fully offline.",
    },
    features: {
      vi: ["Encode / decode text với UTF-8 đầy đủ", "Kéo thả file để encode nhanh", "Decode base64 thành file download", "Nút đổi chiều Encode ⇄ Decode một chạm", "Preview ảnh base64 trực tiếp", "Không giới hạn kích thước (tùy RAM trình duyệt)"],
      en: ["Encode / decode text with full UTF-8", "Drag & drop files to encode quickly", "Decode base64 to a downloadable file", "One-tap Encode ⇄ Decode swap", "Inline preview for base64 images", "No size limit (bounded by browser RAM)"],
    },
    faqs: {
      vi: [
        { q: "Base64 có phải là mã hóa bảo mật không?", a: "Không. Base64 chỉ là biểu diễn (encoding), ai cũng có thể decode được. Nó không bảo mật dữ liệu — nếu cần bảo mật hãy dùng mã hóa thực sự như AES." },
        { q: "Có upload file lên server không?", a: "Không. Toàn bộ encode/decode diễn ra trong trình duyệt. File của bạn không rời khỏi máy." },
        { q: "Tại sao chuỗi base64 dài hơn text gốc?", a: "Base64 dùng 4 ký tự để biểu diễn 3 byte, nên output luôn lớn hơn ~33% so với dữ liệu gốc." },
      ],
      en: [
        { q: "Is Base64 a secure encryption?", a: "No. Base64 is only an encoding — anyone can decode it. For real security, use actual encryption such as AES." },
        { q: "Are files uploaded to a server?", a: "No. All encoding/decoding runs in the browser; your files never leave your device." },
        { q: "Why is Base64 longer than the original?", a: "Base64 uses 4 characters to represent 3 bytes, so output is about 33% larger than the input." },
      ],
    },
  },
  {
    href: "/json",
    iconName: "IconBraces",
    title: "JSON",
    desc: { vi: "Format, minify, validate. Tree view, đếm keys, tính kích thước.", en: "Format, minify, validate. Tree view, key count, size info." },
    tags: ["format", "minify", "tree"],
    category: "cat_text",
    seoTitle: "Format JSON Online - Validate, Minify & Tree View Miễn Phí | FormatBox",
    seoDescription: "Công cụ format JSON online miễn phí: beautify, minify, validate, xem tree view, đếm keys, đo kích thước. Xử lý 100% trên trình duyệt, không gửi dữ liệu lên server.",
    seoKeywords: ["format json", "json formatter", "json online", "json validator", "json beautify", "json minify", "json viewer", "format json online", "kiểm tra json", "định dạng json"],
    intro: {
      vi: "JSON Formatter là công cụ giúp bạn format (làm đẹp), minify (nén), và validate (kiểm tra lỗi) chuỗi JSON ngay trên trình duyệt. Tool hỗ trợ tree view để duyệt cấu trúc lồng nhau, đếm số lượng key, và đo kích thước dữ liệu — tất cả xử lý client-side, không upload file lên server.",
      en: "JSON Formatter helps you format (beautify), minify, and validate JSON strings directly in your browser. It supports an interactive tree view, counts keys, and measures data size — everything runs client-side with no uploads.",
    },
    features: {
      vi: ["Format JSON với indent 2/4 spaces hoặc tab", "Minify JSON để giảm kích thước", "Validate và báo lỗi với vị trí dòng/cột", "Tree view tương tác, có thể fold/expand", "Đếm số keys, arrays, kích thước byte", "Hoạt động 100% offline — bảo mật dữ liệu tuyệt đối"],
      en: ["Format JSON with 2/4 spaces or tab indent", "Minify JSON to reduce size", "Validate with precise line/column errors", "Interactive tree view with fold/expand", "Count keys, arrays, and byte size", "Works 100% offline — fully private"],
    },
    faqs: {
      vi: [
        { q: "Dữ liệu JSON của tôi có bị gửi lên server không?", a: "Không. FormatBox JSON Tool xử lý hoàn toàn trong trình duyệt (client-side). Dữ liệu không bao giờ rời khỏi máy bạn, đảm bảo bảo mật cho dữ liệu nhạy cảm." },
        { q: "Có giới hạn kích thước JSON không?", a: "Giới hạn phụ thuộc vào RAM trình duyệt. Thực tế bạn có thể format file JSON vài chục MB mượt mà." },
        { q: "Tool có miễn phí không?", a: "Hoàn toàn miễn phí, không cần đăng ký, không có quảng cáo, không giới hạn số lần sử dụng." },
      ],
      en: [
        { q: "Is my JSON data sent to a server?", a: "No. FormatBox JSON Tool runs entirely in the browser. Your data never leaves your device, keeping sensitive content private." },
        { q: "Is there a JSON size limit?", a: "Limited only by your browser's RAM. In practice, several tens of MB works smoothly." },
        { q: "Is the tool free?", a: "Completely free, no sign-up, no ads, and no usage limits." },
      ],
    },
  },
  {
    href: "/format-sql",
    iconName: "IconDatabase",
    title: "SQL Formatter",
    desc: {
      vi: "Format, beautify, minify SQL. Hỗ trợ MySQL, PostgreSQL, SQLite, SQL Server, Oracle, BigQuery.",
      en: "Format, beautify, minify SQL. Supports MySQL, PostgreSQL, SQLite, SQL Server, Oracle, BigQuery.",
    },
    tags: ["sql", "format", "beautify", "minify"],
    category: "cat_dev",
    seoTitle: "SQL Formatter Online - Beautify, Minify SQL Miễn Phí | FormatBox",
    seoDescription:
      "Công cụ format SQL online miễn phí: beautify, minify, uppercase keywords. Hỗ trợ MySQL, PostgreSQL, SQLite, SQL Server, Oracle, BigQuery, Redshift. Chạy 100% trên trình duyệt.",
    seoKeywords: [
      "sql formatter",
      "format sql",
      "sql beautifier",
      "sql online",
      "beautify sql",
      "minify sql",
      "mysql formatter",
      "postgresql formatter",
      "định dạng sql",
    ],
    intro: {
      vi: "SQL Formatter giúp bạn format (làm đẹp) và minify (nén) câu truy vấn SQL ngay trên trình duyệt. Hỗ trợ nhiều dialect: MySQL, PostgreSQL, SQLite, SQL Server, Oracle (PL/SQL), BigQuery, Redshift, DB2. Dữ liệu không rời khỏi máy.",
      en: "SQL Formatter beautifies and minifies SQL queries directly in your browser. Supports many dialects: MySQL, PostgreSQL, SQLite, SQL Server, Oracle (PL/SQL), BigQuery, Redshift, DB2. Your data never leaves your device.",
    },
    features: {
      vi: [
        "Format SQL với indent 2/4 spaces hoặc tab",
        "Minify SQL (xóa khoảng trắng dư)",
        "Uppercase/lowercase từ khoá",
        "Hỗ trợ MySQL, PostgreSQL, SQLite, SQL Server, Oracle, BigQuery, Redshift",
        "Copy, download, clear nhanh",
        "Hoạt động 100% offline — bảo mật tuyệt đối",
      ],
      en: [
        "Format SQL with 2/4 spaces or tab indent",
        "Minify SQL (strip extra whitespace)",
        "Uppercase/lowercase keywords",
        "Supports MySQL, PostgreSQL, SQLite, SQL Server, Oracle, BigQuery, Redshift",
        "One-click copy, download, clear",
        "Works 100% offline — fully private",
      ],
    },
    faqs: {
      vi: [
        { q: "SQL của tôi có bị gửi lên server không?", a: "Không. Toàn bộ xử lý diễn ra trong trình duyệt. Dữ liệu không rời khỏi máy bạn." },
        { q: "Hỗ trợ những dialect SQL nào?", a: "MySQL, PostgreSQL, SQLite, SQL Server (Transact-SQL), Oracle (PL/SQL), BigQuery, Redshift, DB2, MariaDB, Snowflake, Trino, Hive, Spark." },
        { q: "Có giới hạn độ dài query không?", a: "Không có giới hạn cứng. Query vài MB vẫn format mượt." },
      ],
      en: [
        { q: "Is my SQL sent to any server?", a: "No. Everything runs in your browser; your data never leaves your device." },
        { q: "Which SQL dialects are supported?", a: "MySQL, PostgreSQL, SQLite, SQL Server (Transact-SQL), Oracle (PL/SQL), BigQuery, Redshift, DB2, MariaDB, Snowflake, Trino, Hive, Spark." },
        { q: "Is there a query length limit?", a: "No hard limit. Queries of several MB still format smoothly." },
      ],
    },
  },
  {
    href: "/workflow-timeline",
    iconName: "IconTimeline",
    title: "Workflow Timeline",
    desc: {
      vi: "Trực quan hoá log workflow BPM/CRM từ JSON — timeline node, hand-off, bảng log entries.",
      en: "Visualize BPM/CRM workflow logs from JSON — node timeline, hand-offs, log entries table.",
    },
    tags: ["workflow", "timeline", "bpm", "json", "log"],
    category: "cat_text",
    seoTitle: "Workflow Timeline Viewer - Trực quan hoá log workflow từ JSON | FormatBox",
    seoDescription:
      "Upload JSON log workflow (nodeinstancelog) để xem timeline node, hand-off, assignee và bảng log entries. Xử lý client-side, không upload server.",
    seoKeywords: [
      "workflow timeline",
      "workflow viewer",
      "bpm log viewer",
      "nodeinstancelog",
      "workflow json visualizer",
      "trực quan workflow",
    ],
    intro: {
      vi: "Workflow Timeline giúp bạn upload JSON log workflow (dạng danh sách nodeinstancelog) và xem toàn bộ dòng chảy xử lý: mỗi node là một hàng trên timeline, các log entry hiện dưới dạng dot, hand-off giữa node vẽ bằng mũi tên đứt nét. Phù hợp để debug workflow BPM/CRM.",
      en: "Workflow Timeline lets you upload a workflow log JSON (nodeinstancelog list) and inspect the full processing flow: each node is a row on the timeline, log entries render as dots, hand-offs between nodes show as dashed arrows. Great for debugging BPM/CRM workflows.",
    },
    features: {
      vi: [
        "Upload file JSON hoặc paste trực tiếp",
        "Danh sách workflow kèm trạng thái & số node",
        "Timeline Equal steps hoặc Proportional time",
        "Hand-off giữa node vẽ bằng mũi tên đứt nét",
        "Bảng log entries với thời gian chênh lệch",
        "Chạy 100% trên trình duyệt — dữ liệu không rời khỏi máy",
      ],
      en: [
        "Upload JSON file or paste directly",
        "Workflow list with status and node count",
        "Timeline in Equal steps or Proportional time",
        "Hand-offs between nodes drawn as dashed arrows",
        "Log entries table with time deltas",
        "Runs 100% in the browser — data never leaves your device",
      ],
    },
    faqs: {
      vi: [
        {
          q: "Định dạng JSON cần như thế nào?",
          a: "Object có key `data` là mảng các log entry, mỗi entry gồm workflowinstanceid, nodeinstancelogid, nodeinstanceid, nodeinstancestatus, useraction, assigneduser, createddate, createduser.",
        },
        { q: "Dữ liệu có bị upload lên server không?", a: "Không. Toàn bộ parse và render trong trình duyệt." },
        { q: "Có giới hạn kích thước không?", a: "Giới hạn theo RAM trình duyệt. Vài MB vẫn mượt." },
      ],
      en: [
        {
          q: "What JSON shape is expected?",
          a: "An object with a `data` array of log entries. Each entry has workflowinstanceid, nodeinstancelogid, nodeinstanceid, nodeinstancestatus, useraction, assigneduser, createddate, createduser.",
        },
        { q: "Is data uploaded to a server?", a: "No. All parsing and rendering happens in the browser." },
        { q: "Is there a size limit?", a: "Bounded by browser RAM. Several MB stays smooth." },
      ],
    },
  },
  {
    href: "/graph",
    iconName: "IconChartDots3",
    title: "JSON Graph",
    desc: { vi: "Chuyển JSON thành đồ thị tương tác. Pan, zoom, khám phá cấu trúc.", en: "Turn JSON into an interactive graph. Pan, zoom, explore." },
    tags: ["graph", "pan", "zoom"],
    category: "cat_text",
    seoTitle: "JSON Graph Viewer - Visualize JSON thành đồ thị | FormatBox",
    seoDescription: "Chuyển JSON thành đồ thị tương tác (interactive graph). Pan, zoom, khám phá cấu trúc lồng nhau. Miễn phí, chạy 100% trên trình duyệt.",
    seoKeywords: ["json graph", "json visualizer", "json viewer", "json tree", "visualize json", "json diagram"],
    intro: {
      vi: "JSON Graph biến dữ liệu JSON phức tạp thành đồ thị trực quan: mỗi object/array là một node, các mối quan hệ hiển thị dưới dạng cạnh nối. Phù hợp khi debug API response, phân tích cấu trúc dữ liệu lồng sâu, hoặc giải thích schema cho team.",
      en: "JSON Graph turns complex JSON into a visual graph: each object/array becomes a node, with edges showing relationships. Great for debugging API responses, exploring deeply nested data, or explaining schemas to your team.",
    },
    features: {
      vi: ["Pan & zoom mượt", "Fold/expand node", "Highlight path khi click", "Export ảnh graph", "Xử lý JSON lớn", "Chạy offline"],
      en: ["Smooth pan & zoom", "Fold/expand nodes", "Highlight path on click", "Export graph as image", "Handles large JSON", "Runs offline"],
    },
    faqs: {
      vi: [
        { q: "Hỗ trợ file JSON lớn không?", a: "Có, giới hạn phụ thuộc RAM trình duyệt. Vài MB chạy mượt." },
        { q: "Có upload dữ liệu lên server không?", a: "Không. Tất cả render client-side." },
        { q: "Export được graph không?", a: "Có, bạn có thể screenshot hoặc dùng tính năng export ảnh." },
      ],
      en: [
        { q: "Does it handle large JSON files?", a: "Yes, limited by browser RAM. Several MB runs smoothly." },
        { q: "Is data uploaded to a server?", a: "No. Everything renders client-side." },
        { q: "Can I export the graph?", a: "Yes — take a screenshot or use the built-in export." },
      ],
    },
  },
  {
    href: "/image",
    iconName: "IconPhoto",
    title: "Image Converter",
    desc: { vi: "PNG, JPG, WebP qua lại. Chỉnh chất lượng, xem trước tức thì.", en: "PNG, JPG, WebP. Tune quality, live preview." },
    tags: ["png", "jpg", "webp"],
    category: "cat_media",
    seoTitle: "Image Converter Online - Chuyển đổi ảnh JPG, PNG, WebP, AVIF | FormatBox",
    seoDescription: "Chuyển đổi ảnh online: JPG, PNG, WebP, AVIF. Resize, nén, đổi định dạng hàng loạt. Xử lý trên trình duyệt, không upload server.",
    seoKeywords: ["chuyển đổi ảnh", "image converter", "jpg to png", "png to webp", "convert image", "resize ảnh", "nén ảnh online"],
    intro: {
      vi: "Image Converter cho phép đổi định dạng ảnh (JPG, PNG, WebP, AVIF), resize, nén chất lượng — tất cả xử lý ngay trên trình duyệt bằng Canvas API. Ảnh không được upload lên server, bảo mật tuyệt đối.",
      en: "Image Converter changes image formats (JPG, PNG, WebP, AVIF), resizes, and compresses — all done in-browser via the Canvas API. Images are never uploaded, keeping them fully private.",
    },
    features: {
      vi: ["Hỗ trợ JPG/PNG/WebP/AVIF", "Resize theo chiều rộng/cao", "Điều chỉnh chất lượng nén", "Xử lý hàng loạt", "Kéo thả nhiều file", "Download từng file hoặc ZIP"],
      en: ["Supports JPG/PNG/WebP/AVIF", "Resize by width/height", "Adjustable compression quality", "Batch processing", "Drag & drop many files", "Download single files or a ZIP"],
    },
    faqs: {
      vi: [
        { q: "Ảnh có bị gửi lên server không?", a: "Không. Convert bằng Canvas API ngay trên trình duyệt." },
        { q: "AVIF có hỗ trợ mọi trình duyệt không?", a: "Chrome, Firefox, Safari mới hỗ trợ encode AVIF. Trình duyệt cũ sẽ không chạy được." },
        { q: "Chất lượng nên để bao nhiêu?", a: "80–85% là cân bằng tốt giữa kích thước và chất lượng cho web." },
      ],
      en: [
        { q: "Are images uploaded?", a: "No. Conversion happens via the Canvas API in your browser." },
        { q: "Does AVIF work in every browser?", a: "Recent Chrome, Firefox, and Safari support AVIF encoding. Older browsers won't work." },
        { q: "What quality should I use?", a: "80–85% is a good balance between size and quality for the web." },
      ],
    },
  },
  {
    href: "/photobooth",
    iconName: "IconCamera",
    title: "Photobooth",
    desc: { vi: "Chụp bộ ảnh photobooth bằng camera, chọn filter, sticker, khung — tải về PNG.", en: "Capture a photobooth strip with your camera, pick filters, stickers, frames — export PNG." },
    tags: ["camera", "photo", "booth", "sticker", "filter"],
    category: "cat_media",
    seoTitle: "Photobooth Online - Chụp ảnh webcam có hiệu ứng | FormatBox",
    seoDescription: "Photobooth online miễn phí: chụp ảnh webcam với filter, sticker, khung ảnh. Ghép strip 4 ảnh, download chất lượng cao. Chạy 100% trên trình duyệt.",
    seoKeywords: ["photobooth online", "chụp ảnh webcam", "photo strip", "webcam filter", "photobooth miễn phí", "4 cut photo"],
    intro: {
      vi: "Photobooth online cho phép dùng webcam chụp ảnh với nhiều filter, sticker, và ghép thành photo strip 4 ô theo phong cách Hàn Quốc. Không cần cài app, chạy ngay trên trình duyệt.",
      en: "An online photobooth that uses your webcam to take photos with filters, stickers, and Korean-style 4-cut photo strips. No app install — runs right in the browser.",
    },
    features: {
      vi: ["Filter màu đa dạng", "Sticker và khung ảnh", "Ghép strip 2/4/6 ảnh", "Đếm ngược trước khi chụp", "Download PNG chất lượng cao", "Không lưu ảnh lên server"],
      en: ["Many color filters", "Stickers and frames", "2/4/6-cut photo strips", "Countdown before each shot", "High-quality PNG download", "No photos stored on any server"],
    },
    faqs: {
      vi: [
        { q: "Ảnh của tôi có bị gửi đi đâu không?", a: "Không. Ảnh xử lý và lưu trong trình duyệt của bạn." },
        { q: "Cần cho phép webcam không?", a: "Có, bạn cần cấp quyền camera để tool hoạt động." },
        { q: "Dùng trên điện thoại được không?", a: "Được, hỗ trợ camera trước và sau trên mobile." },
      ],
      en: [
        { q: "Are my photos sent anywhere?", a: "No. Photos are processed and kept in your browser." },
        { q: "Do I need to allow webcam access?", a: "Yes, camera permission is required for the tool to work." },
        { q: "Does it work on mobile?", a: "Yes, both front and rear cameras are supported on phones." },
      ],
    },
  },
  {
    href: "/audio-studio",
    iconName: "IconWaveSine",
    title: "Audio Studio",
    desc: { vi: "Cắt, đổi tốc độ, fade, đảo ngược, chuẩn hoá âm lượng. Xuất WAV, chạy 100% trên trình duyệt.", en: "Trim, speed, fade, reverse, normalize. Export WAV, fully client-side." },
    tags: ["audio", "mp3", "wav", "trim", "editor"],
    category: "cat_media",
    seoTitle: "Audio Studio Online - Cắt, ghép, chuyển định dạng audio | FormatBox",
    seoDescription: "Audio Studio online: cắt, ghép, chuyển MP3, WAV, OGG, điều chỉnh âm lượng. Xử lý ngay trên trình duyệt, không upload file.",
    seoKeywords: ["cắt nhạc online", "ghép audio", "chuyển mp3", "audio editor online", "mp3 cutter", "audio converter"],
    intro: {
      vi: "Audio Studio là bộ công cụ xử lý âm thanh online: cắt đoạn, ghép nhiều file, chuyển định dạng (MP3, WAV, OGG), điều chỉnh volume. Chạy bằng Web Audio API ngay trên trình duyệt.",
      en: "Audio Studio is an online audio toolkit: trim clips, merge files, convert formats (MP3, WAV, OGG), and adjust volume. Powered by the Web Audio API in your browser.",
    },
    features: {
      vi: ["Cắt audio theo waveform", "Ghép nhiều file", "Convert MP3 ⇄ WAV ⇄ OGG", "Điều chỉnh âm lượng", "Fade in/out", "Không upload file"],
      en: ["Trim audio by waveform", "Merge multiple files", "Convert MP3 ⇄ WAV ⇄ OGG", "Adjust volume", "Fade in / fade out", "No file uploads"],
    },
    faqs: {
      vi: [
        { q: "Có upload nhạc lên server không?", a: "Không, mọi xử lý diễn ra trong trình duyệt." },
        { q: "File audio tối đa bao nhiêu?", a: "Phụ thuộc RAM — thực tế vài trăm MB chạy mượt." },
        { q: "Có hỗ trợ MP3 không?", a: "Có, decode và encode MP3 đều hỗ trợ." },
      ],
      en: [
        { q: "Is my audio uploaded?", a: "No, everything is processed in the browser." },
        { q: "What's the max audio file size?", a: "RAM-bound — a few hundred MB usually works fine." },
        { q: "Is MP3 supported?", a: "Yes, both decode and encode." },
      ],
    },
  },
  {
    href: "/qr",
    iconName: "IconQrcode",
    title: "QR Code",
    desc: { vi: "Tạo mã QR từ text/URL, tuỳ chỉnh màu, kích thước, mức sửa lỗi. Tải PNG/SVG.", en: "Create QR codes from text/URL, customize color, size, error correction. Download PNG/SVG." },
    tags: ["qr", "qrcode", "barcode", "png", "svg"],
    category: "cat_media",
    seoTitle: "Tạo Mã QR Online Miễn Phí - QR Code Generator | FormatBox",
    seoDescription: "Tạo mã QR online miễn phí cho URL, text, WiFi, vCard. Tùy chỉnh màu, logo, mức sửa lỗi. Download PNG/SVG chất lượng cao. Không watermark, không giới hạn.",
    seoKeywords: ["tạo mã qr", "qr code generator", "tạo qr online", "qr miễn phí", "qr code wifi", "qr vcard", "qr code png", "qr code svg", "tạo mã qr code"],
    intro: {
      vi: "Tool tạo mã QR online miễn phí hỗ trợ URL, text, số điện thoại, email, WiFi, vCard. Tùy chỉnh màu sắc, mức error correction, download dưới dạng PNG hoặc SVG. Toàn bộ generate trên trình duyệt, không gửi dữ liệu đi đâu.",
      en: "Free online QR generator for URLs, text, phone numbers, email, WiFi, and vCards. Customize colors and error-correction level, download as PNG or SVG. Everything is generated in the browser — nothing is sent anywhere.",
    },
    features: {
      vi: ["Tạo QR cho URL, text, WiFi, vCard, email, SMS", "Tùy chỉnh màu nền và màu mã", "4 mức sửa lỗi: L, M, Q, H", "Export PNG high-res hoặc SVG vector", "Preview realtime khi nhập", "Không watermark, không logo bắt buộc"],
      en: ["QR for URL, text, WiFi, vCard, email, SMS", "Customize background and code colors", "4 error-correction levels: L, M, Q, H", "Export high-res PNG or vector SVG", "Realtime preview as you type", "No watermark, no forced logo"],
    },
    faqs: {
      vi: [
        { q: "Mã QR tôi tạo có hết hạn không?", a: "Không. QR được tạo offline trên trình duyệt — nó là một ảnh vĩnh viễn, không phụ thuộc vào server nào cả." },
        { q: "Có thể tạo QR cho WiFi được không?", a: "Có. Chọn loại WiFi, nhập SSID, mật khẩu, loại mã hóa — QR tạo ra sẽ cho điện thoại tự động kết nối khi quét." },
        { q: "Mức error correction nên chọn gì?", a: "Mức M (15%) cho hầu hết trường hợp. Chọn H (30%) nếu dán logo lên QR hoặc in trên bề mặt dễ bẩn/mờ." },
      ],
      en: [
        { q: "Does the QR code expire?", a: "No. QR codes are generated offline — they're permanent images that don't depend on any server." },
        { q: "Can I create a WiFi QR?", a: "Yes. Choose WiFi, enter SSID, password, and encryption — scanning the QR auto-connects compatible phones." },
        { q: "Which error-correction level should I pick?", a: "M (15%) for most cases. Use H (30%) if you place a logo on the QR or print on dirty/worn surfaces." },
      ],
    },
  },
  {
    href: "/favicon-export",
    iconName: "IconBrowser",
    title: "Favicon Export",
    desc: { vi: "Upload 1 ảnh, sinh đầy đủ favicon 16→512, apple-touch, PWA. Kèm snippet HTML.", en: "Upload one image, get the full favicon set 16→512, apple-touch, PWA. HTML snippet included." },
    tags: ["favicon", "icon", "pwa", "apple-touch", "manifest"],
    category: "cat_media",
    seoTitle: "Favicon Generator - Tạo favicon từ ảnh hoặc text | FormatBox",
    seoDescription: "Tạo favicon đầy đủ sizes (16, 32, 180, 192, 512) từ ảnh hoặc text. Export ICO, PNG, Apple touch icon, manifest. Chuẩn web hiện đại.",
    seoKeywords: ["favicon generator", "tạo favicon", "favicon.ico", "apple touch icon", "web manifest", "favicon png"],
    intro: {
      vi: "Favicon Export tạo bộ favicon đầy đủ (ICO, PNG đa kích thước, Apple touch icon, Android chrome, web manifest) từ ảnh upload hoặc text/emoji. Dán HTML snippet vào thẻ <head> là xong.",
      en: "Favicon Export produces a complete favicon set (ICO, multi-size PNG, Apple touch icon, Android Chrome, web manifest) from an uploaded image or text/emoji. Paste the HTML snippet into <head> and you're done.",
    },
    features: {
      vi: ["ICO + PNG nhiều kích thước", "Apple Touch Icon 180×180", "Android/Chrome 192 & 512", "Web manifest JSON", "HTML snippet có sẵn", "Export ZIP"],
      en: ["ICO + multi-size PNG", "Apple Touch Icon 180×180", "Android/Chrome 192 & 512", "Web manifest JSON", "Ready-to-paste HTML snippet", "Export as ZIP"],
    },
    faqs: {
      vi: [
        { q: "Favicon nên dùng kích thước nào?", a: "Tối thiểu 32×32 cho tab, 180×180 cho Apple, 512×512 cho PWA." },
        { q: "ICO vs PNG khác gì?", a: "ICO là format cũ cho Windows/IE; trình duyệt hiện đại dùng PNG. Có cả 2 là an toàn nhất." },
        { q: "Có cần web manifest không?", a: "Cần nếu bạn muốn site cài được như PWA trên mobile." },
      ],
      en: [
        { q: "Which favicon sizes should I use?", a: "At least 32×32 for tabs, 180×180 for Apple, 512×512 for PWA." },
        { q: "ICO vs PNG — what's the difference?", a: "ICO is the legacy format for Windows/IE; modern browsers use PNG. Shipping both is safest." },
        { q: "Do I need a web manifest?", a: "Yes, if you want the site installable as a PWA on mobile." },
      ],
    },
  },
  {
    href: "/bill",
    iconName: "IconReceipt",
    title: "Bill Splitter",
    desc: { vi: "Chia tiền theo nhóm — nhập item, người tham gia, xuất bill PNG.", en: "Split expenses in a group — items, people, export as PNG." },
    tags: ["bill", "split", "png"],
    category: "cat_media",
    seoTitle: "Chia Hóa Đơn Online - Bill Splitter Nhóm Bạn | FormatBox",
    seoDescription: "Chia hóa đơn công bằng cho nhóm bạn ăn uống, du lịch. Tính tip, VAT, chia theo món, ai đã trả hộ. Miễn phí, không cần đăng ký.",
    seoKeywords: ["chia hóa đơn", "bill splitter", "tính tiền nhóm", "chia tiền ăn", "split bill", "tính tip"],
    intro: {
      vi: "Bill Splitter giúp chia hóa đơn công bằng cho nhóm: nhập danh sách món, chọn ai ăn món nào, thêm tip và VAT — tool tự tính ai nợ ai bao nhiêu. Phù hợp đi ăn, du lịch, tiệc nhóm.",
      en: "Bill Splitter fairly divides a bill across a group: list the items, pick who had what, add tip and VAT — the tool computes who owes whom. Perfect for meals, trips, and group parties.",
    },
    features: {
      vi: ["Chia theo món hoặc đều", "Thêm tip & VAT tự động", "Tính ai trả hộ cho ai", "Hỗ trợ nhiều người", "Export kết quả", "Chạy offline"],
      en: ["Split by item or evenly", "Auto-add tip & VAT", "Compute who paid for whom", "Supports many people", "Export the result", "Runs offline"],
    },
    faqs: {
      vi: [
        { q: "Có hỗ trợ chia không đều không?", a: "Có, bạn chọn ai ăn món nào, tool tự tính phần của mỗi người." },
        { q: "Dữ liệu có lưu không?", a: "Chỉ lưu trong trình duyệt (localStorage), không gửi server." },
        { q: "Có app mobile không?", a: "Chưa, nhưng web chạy tốt trên điện thoại." },
      ],
      en: [
        { q: "Does it support uneven splits?", a: "Yes — pick who had which item and the tool calculates each person's share." },
        { q: "Is the data saved?", a: "Only in your browser (localStorage); nothing is sent to a server." },
        { q: "Is there a mobile app?", a: "Not yet, but the web app works great on phones." },
      ],
    },
  },
  {
    href: "/jwt",
    iconName: "IconKey",
    title: "JWT Decoder",
    desc: { vi: "Giải mã header + payload, xem claims và trạng thái hết hạn.", en: "Decode header + payload, inspect claims and expiry." },
    tags: ["jwt", "token", "decode"],
    category: "cat_text",
    seoTitle: "JWT Decoder Online - Giải mã JSON Web Token | FormatBox",
    seoDescription: "Decode và kiểm tra JWT (JSON Web Token) online. Xem header, payload, signature. Validate thời gian hết hạn. Xử lý client-side, token không gửi lên server.",
    seoKeywords: ["jwt decoder", "giải mã jwt", "jwt online", "json web token", "decode jwt", "jwt validator", "jwt debugger", "parse jwt"],
    intro: {
      vi: "JWT Decoder giúp bạn phân tích JSON Web Token: giải mã header và payload (base64url), kiểm tra thời gian hết hạn (exp), issued at (iat), và các claim khác. Tool chạy hoàn toàn trong trình duyệt — token nhạy cảm không bao giờ gửi đi đâu.",
      en: "JWT Decoder parses JSON Web Tokens: decodes header and payload (base64url), checks expiry (exp), issued-at (iat), and other claims. Everything runs in the browser — sensitive tokens are never sent anywhere.",
    },
    features: {
      vi: ["Decode header & payload JWT", "Hiển thị claims chuẩn: exp, iat, iss, sub, aud", "Cảnh báo token đã hết hạn", "Pretty-print JSON output", "Copy từng phần một chạm", "An toàn: xử lý 100% trên trình duyệt"],
      en: ["Decode JWT header & payload", "Show standard claims: exp, iat, iss, sub, aud", "Warn when a token is expired", "Pretty-print JSON output", "One-tap copy for each section", "Safe: 100% client-side processing"],
    },
    faqs: {
      vi: [
        { q: "Dán JWT của tôi có an toàn không?", a: "An toàn. Tool chỉ decode trong trình duyệt — token không được gửi lên server của FormatBox hay bất kỳ bên thứ ba nào." },
        { q: "Có verify được signature không?", a: "Việc verify signature cần secret/public key của hệ thống phát hành. Tool hiện tại chỉ decode để xem nội dung, không thực hiện xác thực chữ ký." },
        { q: "JWT khác gì session cookie truyền thống?", a: "JWT là stateless — server không cần lưu session, mọi thông tin đóng gói trong token và được ký để chống giả mạo. Phù hợp cho API và microservices." },
      ],
      en: [
        { q: "Is it safe to paste my JWT here?", a: "Yes. The tool decodes in-browser only — tokens are not sent to FormatBox or any third party." },
        { q: "Can I verify the signature?", a: "Signature verification needs the issuer's secret/public key. This tool only decodes contents; it doesn't verify signatures." },
        { q: "How is JWT different from a session cookie?", a: "JWT is stateless — the server doesn't store sessions; info is packed in the token and signed to prevent tampering. Great for APIs and microservices." },
      ],
    },
  },
  {
    href: "/markdown",
    iconName: "IconMarkdown",
    title: "Markdown Reader",
    desc: { vi: "Đọc file Markdown, xem preview render trực tiếp, copy HTML.", en: "Read Markdown files, live preview, copy HTML." },
    tags: ["markdown", "md", "preview"],
    category: "cat_text",
    seoTitle: "Markdown Editor & Preview Online - Live Preview | FormatBox",
    seoDescription: "Markdown editor online với live preview, hỗ trợ GFM, bảng, code highlight, math. Export HTML, PDF. Không cần cài app.",
    seoKeywords: ["markdown editor", "markdown preview", "markdown online", "md to html", "markdown viewer", "github markdown"],
    intro: {
      vi: "Markdown Reader cho phép viết markdown với live preview, hỗ trợ GitHub Flavored Markdown (bảng, task list, code fence), syntax highlight, math (KaTeX). Export HTML hoặc PDF chỉ với 1 click.",
      en: "Markdown Reader lets you write Markdown with live preview — GitHub Flavored Markdown (tables, task lists, code fences), syntax highlighting, and math (KaTeX). Export to HTML or PDF with one click.",
    },
    features: {
      vi: ["Live preview song song", "GFM đầy đủ (bảng, checklist)", "Syntax highlight 100+ ngôn ngữ", "Math (KaTeX)", "Export HTML/PDF", "Lưu bản nháp local"],
      en: ["Side-by-side live preview", "Full GFM (tables, checklists)", "Syntax highlight for 100+ languages", "Math (KaTeX)", "Export to HTML/PDF", "Save drafts locally"],
    },
    faqs: {
      vi: [
        { q: "Có hỗ trợ Mermaid không?", a: "Có, viết ```mermaid``` block để render diagram." },
        { q: "File markdown có lưu lại không?", a: "Lưu trong localStorage trình duyệt, không mất khi reload." },
        { q: "Export PDF được không?", a: "Được, dùng chức năng Print → Save as PDF của trình duyệt." },
      ],
      en: [
        { q: "Is Mermaid supported?", a: "Yes — use a ```mermaid``` block to render diagrams." },
        { q: "Are drafts saved?", a: "They persist in your browser's localStorage across reloads." },
        { q: "Can I export to PDF?", a: "Yes, via the browser's Print → Save as PDF." },
      ],
    },
  },
  {
    href: "/text-case",
    iconName: "IconLetterCase",
    title: "Text Case",
    desc: { vi: "Đổi giữa camel, snake, kebab, Title, UPPER và nhiều kiểu khác.", en: "Switch between camel, snake, kebab, Title, UPPER and more." },
    tags: ["case", "camel", "snake", "kebab"],
    category: "cat_text",
    seoTitle: "Chuyển Đổi Chữ Hoa Thường Online - Text Case Converter | FormatBox",
    seoDescription: "Chuyển đổi text giữa UPPERCASE, lowercase, Title Case, camelCase, snake_case, kebab-case, PascalCase. Miễn phí, nhanh gọn.",
    seoKeywords: ["chuyển chữ hoa", "text case", "camelcase", "snake case", "kebab case", "uppercase lowercase", "chữ hoa chữ thường"],
    intro: {
      vi: "Text Case Converter đổi text sang mọi dạng chữ: UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE. Hỗ trợ tiếng Việt có dấu.",
      en: "Text Case Converter transforms text into every case: UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE. Supports Vietnamese diacritics.",
    },
    features: {
      vi: ["12+ kiểu case", "Hỗ trợ tiếng Việt có dấu", "Chuyển hàng loạt", "Preview realtime", "Copy một chạm", "Chạy offline"],
      en: ["12+ case styles", "Vietnamese diacritics supported", "Bulk conversion", "Realtime preview", "One-tap copy", "Runs offline"],
    },
    faqs: {
      vi: [
        { q: "Có hỗ trợ tiếng Việt không?", a: "Có, xử lý Unicode chuẩn, giữ nguyên dấu khi đổi hoa/thường." },
        { q: "camelCase vs PascalCase khác gì?", a: "camelCase chữ đầu thường (myVariable), PascalCase chữ đầu hoa (MyClass)." },
        { q: "Dùng để làm gì?", a: "Phổ biến khi code (biến, class, file), SEO slug, chuẩn hóa data." },
      ],
      en: [
        { q: "Is Vietnamese supported?", a: "Yes — standard Unicode handling preserves diacritics across case changes." },
        { q: "camelCase vs PascalCase?", a: "camelCase starts lowercase (myVariable); PascalCase starts uppercase (MyClass)." },
        { q: "What is it for?", a: "Common for code (variables, classes, filenames), SEO slugs, and data normalization." },
      ],
    },
  },
  {
    href: "/responsive",
    iconName: "IconDevices",
    title: "Responsive Tester",
    desc: { vi: "Xem website ở nhiều kích thước iPhone, iPad, laptop, desktop.", en: "View any website across iPhone, iPad, laptop, desktop sizes." },
    tags: ["responsive", "device", "preview"],
    category: "cat_dev",
    seoTitle: "Responsive Tester - Test giao diện web nhiều kích thước | FormatBox",
    seoDescription: "Test responsive website trên nhiều thiết bị cùng lúc: iPhone, iPad, desktop, Android. Preview đa viewport, chụp screenshot.",
    seoKeywords: ["responsive tester", "test responsive", "mobile preview", "viewport tester", "test giao diện mobile"],
    intro: {
      vi: "Responsive Tester mở website trong nhiều viewport cùng lúc (mobile, tablet, desktop) để kiểm tra giao diện responsive. Chọn thiết bị preset hoặc tự nhập kích thước.",
      en: "Responsive Tester opens a website in multiple viewports at once (mobile, tablet, desktop) to check responsive layouts. Pick a device preset or enter a custom size.",
    },
    features: {
      vi: ["Preset: iPhone, iPad, Android, Desktop", "Custom kích thước", "Side-by-side nhiều viewport", "Scroll đồng bộ", "Rotate landscape/portrait", "URL nào cũng test được"],
      en: ["Presets: iPhone, iPad, Android, Desktop", "Custom sizes", "Side-by-side viewports", "Synced scrolling", "Landscape/portrait rotation", "Works with any URL"],
    },
    faqs: {
      vi: [
        { q: "Có test được localhost không?", a: "Chỉ test được URL public (do browser không cho iframe localhost từ domain khác)." },
        { q: "Có screenshot được không?", a: "Dùng công cụ screenshot của OS/trình duyệt để chụp." },
        { q: "Site chặn iframe thì sao?", a: "Site set X-Frame-Options: DENY sẽ không hiển thị được trong tool." },
      ],
      en: [
        { q: "Can I test localhost?", a: "Only public URLs — browsers block iframing localhost from other origins." },
        { q: "Can I take screenshots?", a: "Use your OS or browser's native screenshot tool." },
        { q: "What if a site blocks iframes?", a: "Sites with X-Frame-Options: DENY won't render inside the tool." },
      ],
    },
  },
  {
    href: "/fuel",
    iconName: "IconGasStation",
    title: "Fuel Price",
    desc: { vi: "Giá bán lẻ xăng dầu theo vùng (nguồn Petrolimex), cập nhật mỗi kỳ điều chỉnh.", en: "Retail fuel prices by region (Petrolimex source), refreshed each cycle." },
    tags: ["fuel", "petrolimex", "vn"],
    category: "cat_life",
    seoTitle: "Giá Xăng Dầu Hôm Nay - Cập Nhật Mới Nhất | FormatBox",
    seoDescription: "Giá xăng dầu hôm nay: RON 95, RON 92, dầu diesel, dầu hỏa. Cập nhật theo đợt điều chỉnh mới nhất của Petrolimex, PVOil.",
    seoKeywords: ["giá xăng hôm nay", "giá xăng", "giá dầu", "ron 95", "giá xăng dầu", "petrolimex", "giá xăng mới nhất"],
    intro: {
      vi: "Trang cập nhật giá xăng dầu Việt Nam mới nhất theo mỗi đợt điều chỉnh (15 ngày/lần). Hiển thị giá RON 95, RON 92/E5, dầu diesel, dầu hỏa, so sánh với kỳ trước.",
      en: "Latest Vietnam fuel prices updated every adjustment cycle (every 15 days). Shows RON 95, RON 92/E5, diesel, and kerosene prices with comparisons to the previous period.",
    },
    features: {
      vi: ["Giá cập nhật mới nhất", "RON 95, E5 RON 92, diesel, dầu hỏa", "So sánh với kỳ trước", "Lịch sử điều chỉnh", "Dữ liệu Petrolimex", "Miễn phí"],
      en: ["Latest prices", "RON 95, E5 RON 92, diesel, kerosene", "Compare with previous period", "Adjustment history", "Petrolimex data", "Free"],
    },
    faqs: {
      vi: [
        { q: "Giá cập nhật bao lâu một lần?", a: "Theo quy định mới, 15 ngày điều chỉnh một lần vào thứ Năm." },
        { q: "Nguồn dữ liệu từ đâu?", a: "Từ Petrolimex và các công bố chính thức của liên Bộ Công Thương - Tài chính." },
        { q: "Giá có khác nhau giữa các vùng?", a: "Vùng 2 (miền núi, hải đảo) cao hơn vùng 1 do phụ thu vận chuyển." },
      ],
      en: [
        { q: "How often are prices updated?", a: "Per current rules, every 15 days on Thursdays." },
        { q: "What's the data source?", a: "Petrolimex and official releases from the inter-ministry (Industry & Trade / Finance)." },
        { q: "Do prices differ by region?", a: "Zone 2 (mountains, islands) is higher than Zone 1 due to transport surcharges." },
      ],
    },
  },
  {
    href: "/exchange-currency",
    iconName: "IconCurrencyDollar",
    title: "Exchange",
    desc: { vi: "Đổi tiền, chuyển tiền quốc tế — USD, VND, EUR, JPY và nhiều loại. Tỉ giá live.", en: "Convert & transfer money — USD, VND, EUR, JPY and more. Live mid-market rates." },
    tags: ["currency", "exchange", "usd", "vnd", "eur", "transfer"],
    category: "cat_life",
    seoTitle: "Tỷ Giá Ngoại Tệ Hôm Nay - USD, EUR, JPY, KRW | FormatBox",
    seoDescription: "Tỷ giá ngoại tệ cập nhật realtime: USD, EUR, JPY, KRW, CNY, GBP. Tính chuyển đổi nhanh. Dữ liệu từ Vietcombank và các ngân hàng.",
    seoKeywords: ["tỷ giá hôm nay", "tỷ giá usd", "quy đổi tiền", "exchange rate", "tỷ giá vietcombank", "chuyển đổi tiền tệ"],
    intro: {
      vi: "Tỷ giá ngoại tệ cập nhật từ các ngân hàng lớn (Vietcombank, BIDV, Techcombank). Hỗ trợ 20+ loại tiền, tính chuyển đổi 2 chiều ngay, so sánh tỷ giá mua/bán.",
      en: "Exchange rates sourced from major banks (Vietcombank, BIDV, Techcombank). 20+ currencies, two-way conversion, and buy/sell rate comparisons.",
    },
    features: {
      vi: ["20+ loại tiền tệ", "Tỷ giá mua/bán tiền mặt & chuyển khoản", "Chuyển đổi 2 chiều", "So sánh ngân hàng", "Lịch sử tỷ giá", "Cập nhật thường xuyên"],
      en: ["20+ currencies", "Cash & transfer buy/sell rates", "Two-way conversion", "Bank comparison", "Rate history", "Frequent updates"],
    },
    faqs: {
      vi: [
        { q: "Tỷ giá cập nhật mấy lần/ngày?", a: "Ngân hàng cập nhật nhiều lần trong ngày; tool đồng bộ gần realtime." },
        { q: "Mua/bán khác nhau sao?", a: "Giá bán (ngân hàng bán cho bạn) luôn cao hơn giá mua (ngân hàng mua từ bạn)." },
        { q: "Tiền mặt vs chuyển khoản?", a: "Chuyển khoản thường có giá tốt hơn tiền mặt do chi phí quản lý thấp hơn." },
      ],
      en: [
        { q: "How often do rates update?", a: "Banks update several times a day; the tool stays near realtime." },
        { q: "Why do buy and sell differ?", a: "The sell rate (bank sells to you) is always higher than the buy rate (bank buys from you)." },
        { q: "Cash vs transfer?", a: "Transfers usually get better rates than cash due to lower handling costs." },
      ],
    },
  },
  {
    href: "/gold",
    iconName: "IconCoin",
    title: "Gold Price",
    desc: { vi: "Giá vàng SJC, PNJ, 24K, 18K… đầy đủ. Nguồn PNJ live, cập nhật vài phút một lần.", en: "SJC, PNJ 24K, 18K and more. Live PNJ feed, refreshed every few minutes." },
    tags: ["gold", "sjc", "pnj", "vn", "vang"],
    category: "cat_life",
    seoTitle: "Giá Vàng Hôm Nay - SJC, DOJI, PNJ Mới Nhất | FormatBox",
    seoDescription: "Giá vàng SJC, DOJI, PNJ, 9999 cập nhật realtime. So sánh giá mua/bán giữa các thương hiệu. Biểu đồ biến động.",
    seoKeywords: ["giá vàng hôm nay", "giá vàng sjc", "giá vàng doji", "giá vàng pnj", "giá vàng 9999", "giá vàng miếng"],
    intro: {
      vi: "Giá vàng Việt Nam cập nhật từ SJC, DOJI, PNJ, Bảo Tín Minh Châu. Theo dõi giá vàng miếng, vàng nhẫn, vàng trang sức. So sánh giá mua/bán và biên độ chênh lệch.",
      en: "Vietnam gold prices from SJC, DOJI, PNJ, and Bao Tin Minh Chau. Track bar, ring, and jewelry gold; compare buy/sell prices and spreads.",
    },
    features: {
      vi: ["SJC, DOJI, PNJ, BTMC", "Vàng miếng & nhẫn & nữ trang", "Giá mua/bán realtime", "Biểu đồ biến động", "So sánh thương hiệu", "Miễn phí"],
      en: ["SJC, DOJI, PNJ, BTMC", "Bars, rings & jewelry", "Realtime buy/sell prices", "Price trend chart", "Brand comparison", "Free"],
    },
    faqs: {
      vi: [
        { q: "Giá vàng cập nhật bao lâu?", a: "Các thương hiệu cập nhật nhiều lần/ngày, tool đồng bộ gần realtime." },
        { q: "Vàng SJC khác vàng 9999 thế nào?", a: "SJC là thương hiệu vàng miếng chính thức được NHNN cấp phép; 9999 là độ tinh khiết 99.99%." },
        { q: "Nên mua vàng miếng hay nhẫn?", a: "Vàng miếng dễ bán lại; vàng nhẫn giá rẻ hơn do công thợ thấp." },
      ],
      en: [
        { q: "How often is gold updated?", a: "Brands update several times a day; the tool stays near realtime." },
        { q: "SJC vs 9999 — what's the difference?", a: "SJC is an official gold bar brand licensed by the central bank; 9999 refers to 99.99% purity." },
        { q: "Should I buy bars or rings?", a: "Bars resell more easily; rings are cheaper because craftsmanship cost is lower." },
      ],
    },
  },
  {
    href: "/lucky-ticket",
    iconName: "IconTicket",
    title: "Lucky Ticket",
    desc: { vi: "Dò vé số 3 miền theo kết quả realtime. Nhập số, xem ngay trúng giải nào.", en: "Check Vietnamese lottery tickets against live results across 3 regions." },
    tags: ["lottery", "xo-so", "vn", "ticket", "do-ve-so"],
    category: "cat_life",
    seoTitle: "Dò Vé Số Online - Vietlott, XSMB, XSMN, XSMT | FormatBox",
    seoDescription: "Dò vé số nhanh miễn phí: Vietlott Power 6/55, Mega 6/45, xổ số miền Bắc, miền Nam, miền Trung. Check nhiều vé cùng lúc.",
    seoKeywords: ["dò vé số", "vietlott", "xổ số miền bắc", "xổ số miền nam", "power 6/55", "mega 6/45", "dò xổ số online"],
    intro: {
      vi: "Dò vé số Vietlott (Power 6/55, Mega 6/45) và xổ số truyền thống 3 miền. Nhập dãy số và ngày quay — tool tự đối chiếu với kết quả chính thức.",
      en: "Check Vietlott (Power 6/55, Mega 6/45) and traditional 3-region lottery tickets. Enter your numbers and draw date — the tool matches them against official results.",
    },
    features: {
      vi: ["Vietlott Power & Mega", "Xổ số miền Bắc/Nam/Trung", "Dò nhiều vé cùng lúc", "Lịch sử kết quả", "Hiển thị giải trúng", "Miễn phí"],
      en: ["Vietlott Power & Mega", "North/South/Central lottery", "Check many tickets at once", "Draw history", "Shows the winning tier", "Free"],
    },
    faqs: {
      vi: [
        { q: "Dữ liệu từ đâu?", a: "Từ công bố chính thức của Vietlott và các công ty xổ số kiến thiết." },
        { q: "Có dò vé cũ được không?", a: "Có, tool lưu lịch sử kết quả nhiều kỳ." },
        { q: "Có đảm bảo chính xác không?", a: "Luôn đối chiếu lại với vé gốc và nguồn chính thức để chắc chắn." },
      ],
      en: [
        { q: "Where does the data come from?", a: "Official announcements from Vietlott and the regional lottery companies." },
        { q: "Can I check old tickets?", a: "Yes, the tool keeps a draw history across many periods." },
        { q: "Is it 100% accurate?", a: "Always double-check against your physical ticket and official sources." },
      ],
    },
  },
  {
    href: "/wheel",
    iconName: "IconConfetti",
    title: "Lucky Wheel",
    desc: { vi: "Vòng quay may mắn — nhập danh sách, quay, chọn ngẫu nhiên.", en: "Lucky wheel — enter a list, spin, pick randomly." },
    tags: ["random", "picker", "wheel"],
    category: "cat_life",
    seoTitle: "Vòng Quay May Mắn Online - Random Picker Miễn Phí | FormatBox",
    seoDescription: "Vòng quay may mắn online: nhập danh sách, quay chọn ngẫu nhiên công bằng. Hoạt náo, teambuilding, bốc thăm trúng thưởng.",
    seoKeywords: ["vòng quay may mắn", "lucky wheel", "random picker", "quay số may mắn", "bốc thăm online", "random name"],
    intro: {
      vi: "Vòng quay may mắn online: nhập danh sách tên/mục, quay vòng chọn ngẫu nhiên. Phù hợp hoạt náo lớp, teambuilding, bốc thăm trúng thưởng, chia nhóm.",
      en: "An online lucky wheel: enter names/items and spin for a fair random pick. Great for classroom activities, teambuilding, raffles, and group-making.",
    },
    features: {
      vi: ["Nhập danh sách không giới hạn", "Animation quay mượt", "Loại hoặc giữ sau khi trúng", "Âm thanh quay", "Tùy chỉnh màu từng ô", "Chia sẻ cấu hình"],
      en: ["Unlimited entries", "Smooth spin animation", "Remove or keep winners", "Spin sound", "Per-slice color customization", "Share your setup"],
    },
    faqs: {
      vi: [
        { q: "Có fair/công bằng không?", a: "Có, tool dùng Math.random() — xác suất mỗi ô đều nhau." },
        { q: "Có giới hạn số mục không?", a: "Không giới hạn, nhưng trên 50 mục sẽ khó đọc chữ." },
        { q: "Lưu danh sách được không?", a: "Có, lưu trong localStorage trình duyệt." },
      ],
      en: [
        { q: "Is it fair?", a: "Yes — Math.random() gives each slice equal probability." },
        { q: "Is there an entry limit?", a: "No limit, but over 50 entries the labels become hard to read." },
        { q: "Can I save my list?", a: "Yes, it persists in your browser's localStorage." },
      ],
    },
  },
  {
    href: "/calendar",
    iconName: "IconCalendar",
    title: "Calendar",
    desc: { vi: "Xem lịch dương kèm âm lịch Việt Nam. Chọn ngày để xem ngày/tháng/năm can chi.", en: "Solar calendar with Vietnamese lunar dates. Pick a day to see its Can Chi day/month/year." },
    tags: ["calendar", "lunar", "am-lich", "duong-lich", "vn"],
    category: "cat_life",
    seoTitle: "Lịch Vạn Niên - Lịch Âm Dương, Ngày Tốt Xấu | FormatBox",
    seoDescription: "Lịch vạn niên: xem lịch âm dương, ngày tốt xấu, giờ hoàng đạo, tiết khí. Chuyển đổi âm dương lịch nhanh chóng.",
    seoKeywords: ["lịch vạn niên", "lịch âm", "lịch dương", "ngày tốt xấu", "giờ hoàng đạo", "xem ngày", "âm lịch hôm nay"],
    intro: {
      vi: "Lịch vạn niên giúp xem lịch âm dương, ngày tốt xấu, giờ hoàng đạo, tiết khí 24 trong năm. Chuyển đổi 2 chiều giữa dương lịch và âm lịch Việt Nam.",
      en: "A perpetual calendar for lunar/solar dates, auspicious/inauspicious days, lucky hours, and the 24 solar terms. Two-way conversion between the Vietnamese lunar and solar calendars.",
    },
    features: {
      vi: ["Lịch âm dương chuẩn Việt Nam", "Ngày tốt/xấu, hoàng đạo", "Giờ hoàng đạo", "Tiết khí 24", "Chuyển đổi âm ⇄ dương", "Xem tới 100 năm sau"],
      en: ["Vietnam-standard lunar/solar calendar", "Good/bad days, zodiac days", "Lucky hours", "24 solar terms", "Lunar ⇄ solar conversion", "Up to 100 years ahead"],
    },
    faqs: {
      vi: [
        { q: "Lịch âm có chính xác với VN không?", a: "Có, tính theo chuẩn múi giờ GMT+7 và lịch Việt Nam." },
        { q: "Ngày hoàng đạo là gì?", a: "Theo truyền thống Á Đông, là ngày tốt để làm việc lớn (cưới, khai trương, động thổ)." },
        { q: "Có hỗ trợ xuất lịch không?", a: "Hiện tại chỉ xem online, chưa export file." },
      ],
      en: [
        { q: "Is the lunar calendar accurate for Vietnam?", a: "Yes, computed with GMT+7 and the Vietnamese lunar standard." },
        { q: "What is a 'hoang dao' day?", a: "In East Asian tradition, an auspicious day for major events (weddings, openings, groundbreakings)." },
        { q: "Can I export the calendar?", a: "Currently view-only; export is not supported yet." },
      ],
    },
  },
  {
    href: "/countdown",
    iconName: "IconClock",
    title: "Countdown",
    desc: { vi: "Đếm ngược tới ngày quan trọng — sinh nhật, năm mới, deadline. Lưu nhiều mốc.", en: "Count down to important moments — birthdays, new year, deadlines. Save many events." },
    tags: ["countdown", "timer", "event"],
    category: "cat_life",
    seoTitle: "Đồng Hồ Đếm Ngược Online - Countdown Timer | FormatBox",
    seoDescription: "Đồng hồ đếm ngược online đến sự kiện, ngày sinh nhật, Tết. Hiển thị full màn hình, chia sẻ link countdown.",
    seoKeywords: ["đếm ngược", "countdown", "đồng hồ đếm ngược", "countdown timer", "đếm ngược tết", "đếm ngược sinh nhật"],
    intro: {
      vi: "Đếm ngược tới sự kiện bất kỳ: Tết, sinh nhật, deadline, cưới hỏi. Hiển thị full màn hình, lưu nhiều countdown, chia sẻ link.",
      en: "Count down to any event: Tet, birthdays, deadlines, weddings. Full-screen display, multiple timers saved, and shareable links.",
    },
    features: {
      vi: ["Nhiều countdown cùng lúc", "Full-screen mode", "Chia sẻ qua link", "Âm thanh khi hết giờ", "Tùy chỉnh màu/background", "Preset: Tết, Năm mới, Noel"],
      en: ["Many countdowns at once", "Full-screen mode", "Share via link", "Sound at zero", "Custom colors/backgrounds", "Presets: Tet, New Year, Christmas"],
    },
    faqs: {
      vi: [
        { q: "Đóng tab có mất countdown không?", a: "Không, lưu trong localStorage, mở lại vẫn còn." },
        { q: "Chia sẻ cho người khác được không?", a: "Có, copy link có chứa cấu hình countdown." },
        { q: "Có thông báo khi hết giờ không?", a: "Có âm thanh; thông báo đẩy cần cấp quyền notification." },
      ],
      en: [
        { q: "Do I lose the countdown if I close the tab?", a: "No — it's saved in localStorage and will be there when you return." },
        { q: "Can I share with others?", a: "Yes, copy a link that contains the countdown's config." },
        { q: "Will I be notified when it ends?", a: "A sound plays; push notifications require notification permission." },
      ],
    },
  },
  {
    href: "/weather",
    iconName: "IconCloud",
    title: "Weather",
    desc: { vi: "Xem thời tiết hiện tại và dự báo 7 ngày cho bất kỳ thành phố nào. Nguồn Open-Meteo.", en: "Current conditions and 7-day forecast for any city. Powered by Open-Meteo." },
    tags: ["weather", "forecast", "thoi-tiet"],
    category: "cat_life",
    seoTitle: "Thời Tiết Hôm Nay - Dự Báo 7 Ngày | FormatBox",
    seoDescription: "Thời tiết hôm nay cho mọi thành phố: nhiệt độ, mưa, gió, độ ẩm. Dự báo chi tiết 7 ngày tới. Miễn phí, không cần đăng ký.",
    seoKeywords: ["thời tiết hôm nay", "dự báo thời tiết", "weather vietnam", "thời tiết hà nội", "thời tiết hcm", "weather forecast"],
    intro: {
      vi: "Dự báo thời tiết chi tiết cho mọi thành phố Việt Nam và thế giới: nhiệt độ, lượng mưa, gió, độ ẩm, UV, AQI. Dự báo 7 ngày, cập nhật hàng giờ.",
      en: "Detailed weather forecasts for any city in Vietnam and worldwide: temperature, rainfall, wind, humidity, UV, and AQI. 7-day forecasts updated hourly.",
    },
    features: {
      vi: ["Tìm thành phố nhanh", "Nhiệt độ, mưa, gió, độ ẩm", "Dự báo 7 ngày", "Chỉ số UV & AQI", "Vị trí hiện tại (GPS)", "Nhiều thành phố yêu thích"],
      en: ["Fast city search", "Temperature, rain, wind, humidity", "7-day forecast", "UV & AQI indexes", "Current location (GPS)", "Multiple favorite cities"],
    },
    faqs: {
      vi: [
        { q: "Dữ liệu từ đâu?", a: "Từ các API thời tiết uy tín (OpenWeather hoặc tương đương)." },
        { q: "Có chính xác cho VN không?", a: "Có, hỗ trợ hàng ngàn địa điểm Việt Nam." },
        { q: "Cần cấp quyền vị trí không?", a: "Chỉ khi muốn xem thời tiết vị trí hiện tại, có thể từ chối và nhập tay." },
      ],
      en: [
        { q: "What's the data source?", a: "Reputable weather APIs (OpenWeather or equivalent)." },
        { q: "Is it accurate for Vietnam?", a: "Yes — thousands of locations across Vietnam are supported." },
        { q: "Do I need to grant location access?", a: "Only to use your current location; you can decline and enter a city manually." },
      ],
    },
  },
  {
    href: "/timestamp",
    iconName: "IconClockHour4",
    title: "Timestamp",
    desc: { vi: "Chuyển đổi Unix timestamp qua lại với ngày giờ. ISO, UTC, local, relative time.", en: "Convert Unix timestamps to and from dates. ISO, UTC, local, relative time." },
    tags: ["timestamp", "unix", "epoch", "iso", "date"],
    category: "cat_dev",
    seoTitle: "Timestamp Converter - Unix Time ⇄ Date | FormatBox",
    seoDescription: "Chuyển đổi Unix timestamp sang ngày giờ và ngược lại. Hỗ trợ seconds/milliseconds, nhiều timezone, ISO 8601. Dev tool miễn phí.",
    seoKeywords: ["timestamp converter", "unix time", "epoch converter", "chuyển timestamp", "iso 8601", "unix timestamp vietnam"],
    intro: {
      vi: "Timestamp Converter chuyển đổi 2 chiều giữa Unix timestamp (seconds/milliseconds) và ngày giờ ở các timezone. Hỗ trợ ISO 8601, RFC 3339, format tùy chỉnh.",
      en: "Timestamp Converter translates two-way between Unix timestamps (seconds/milliseconds) and date/time in any timezone. Supports ISO 8601, RFC 3339, and custom formats.",
    },
    features: {
      vi: ["Unix ⇄ Date 2 chiều", "Seconds & milliseconds", "Nhiều timezone", "ISO 8601 / RFC 3339", "Giờ hiện tại realtime", "Copy một chạm"],
      en: ["Two-way Unix ⇄ Date", "Seconds & milliseconds", "Many timezones", "ISO 8601 / RFC 3339", "Live current time", "One-tap copy"],
    },
    faqs: {
      vi: [
        { q: "Seconds vs milliseconds khác gì?", a: "Unix epoch dùng seconds (10 chữ số); JavaScript dùng milliseconds (13 chữ số)." },
        { q: "Timezone nào mặc định?", a: "Timezone trình duyệt của bạn, có thể đổi sang bất kỳ zone nào." },
        { q: "ISO 8601 là gì?", a: "Chuẩn quốc tế: YYYY-MM-DDTHH:MM:SSZ, phổ biến trong API." },
      ],
      en: [
        { q: "Seconds vs milliseconds?", a: "Unix epoch uses seconds (10 digits); JavaScript uses milliseconds (13 digits)." },
        { q: "What's the default timezone?", a: "Your browser's timezone — switchable to any zone." },
        { q: "What is ISO 8601?", a: "The international standard YYYY-MM-DDTHH:MM:SSZ, widely used in APIs." },
      ],
    },
  },
  {
    href: "/speed-test",
    iconName: "IconGauge",
    title: "Speed Test",
    desc: { vi: "Đo tốc độ Wi-Fi / mạng: download, upload, ping, jitter. Chạy trực tiếp trên trình duyệt, chính xác.", en: "Measure Wi-Fi / network speed: download, upload, ping, jitter. Runs in your browser, accurate." },
    tags: ["speed", "wifi", "network", "internet", "mbps", "ping"],
    category: "cat_dev",
    seoTitle: "Test Tốc Độ Mạng Online - Speed Test Miễn Phí | FormatBox",
    seoDescription: "Test tốc độ mạng Internet: download, upload, ping, jitter. Nhanh, chính xác, không quảng cáo. Chạy trên trình duyệt.",
    seoKeywords: ["speed test", "test tốc độ mạng", "kiểm tra tốc độ internet", "ping test", "wifi speed", "test mạng"],
    intro: {
      vi: "Speed Test đo tốc độ Internet của bạn: download, upload, ping, jitter. Chạy ngay trên trình duyệt, không cần cài app, không quảng cáo xen ngang.",
      en: "Speed Test measures your Internet speed: download, upload, ping, and jitter. Runs in the browser — no apps, no interrupting ads.",
    },
    features: {
      vi: ["Download & upload speed", "Ping & jitter", "Chọn server test", "Lịch sử các lần test", "Hoạt động trên mobile", "Không quảng cáo"],
      en: ["Download & upload speed", "Ping & jitter", "Pick a test server", "Test history", "Works on mobile", "Ad-free"],
    },
    faqs: {
      vi: [
        { q: "Kết quả có chính xác không?", a: "Tương đương với các tool phổ biến như Speedtest.net; sai số nhỏ do điều kiện mạng." },
        { q: "Tại sao tốc độ thấp hơn gói đăng ký?", a: "Phụ thuộc tải mạng, thiết bị, WiFi vs dây, server test, số thiết bị dùng chung." },
        { q: "Nên test khi nào?", a: "Khi mạng cảm thấy chậm, trước khi báo nhà mạng. Test 2–3 lần lấy trung bình." },
      ],
      en: [
        { q: "Are the results accurate?", a: "Comparable to tools like Speedtest.net; small deviations are normal depending on network conditions." },
        { q: "Why is my speed lower than my plan?", a: "Depends on network load, device, WiFi vs wired, test server, and the number of devices sharing the line." },
        { q: "When should I run a test?", a: "When the network feels slow and before calling your ISP. Test 2–3 times and take the average." },
      ],
    },
  },
  {
    href: "/color",
    iconName: "IconPalette",
    title: "Color",
    desc: { vi: "HEX, RGB, HSL, HSB, OKLCH. Bảng tint/shade, contrast WCAG, copy một chạm.", en: "HEX, RGB, HSL, HSB, OKLCH. Tint/shade palette, WCAG contrast, one-click copy." },
    tags: ["color", "hex", "rgb", "hsl", "oklch", "palette", "contrast", "wcag"],
    category: "cat_dev",
    seoTitle: "Color Picker & Converter - HEX, RGB, HSL, OKLCH | FormatBox",
    seoDescription: "Color picker online: chọn màu, chuyển HEX ⇄ RGB ⇄ HSL ⇄ OKLCH. Palette gợi ý, contrast WCAG, gradient generator.",
    seoKeywords: ["color picker", "chuyển mã màu", "hex to rgb", "rgb to hex", "hsl color", "color palette", "màu web"],
    intro: {
      vi: "Color Picker & Converter: chọn màu bằng picker trực quan, chuyển đổi giữa HEX, RGB, HSL, OKLCH. Gợi ý palette hài hòa, kiểm tra contrast WCAG, tạo gradient.",
      en: "Color Picker & Converter: pick a color visually, convert between HEX, RGB, HSL, and OKLCH. Harmonious palette suggestions, WCAG contrast checks, and gradient generation.",
    },
    features: {
      vi: ["Picker trực quan + eyedropper", "HEX ⇄ RGB ⇄ HSL ⇄ OKLCH", "Contrast ratio WCAG AA/AAA", "Palette hài hòa", "Gradient generator", "Lưu màu yêu thích"],
      en: ["Visual picker + eyedropper", "HEX ⇄ RGB ⇄ HSL ⇄ OKLCH", "WCAG AA/AAA contrast ratio", "Harmonious palettes", "Gradient generator", "Save favorite colors"],
    },
    faqs: {
      vi: [
        { q: "OKLCH là gì?", a: "Color space mới, perceptually uniform — độ sáng/màu nhất quán hơn HSL, hỗ trợ CSS Color 4." },
        { q: "Contrast ratio cần bao nhiêu?", a: "WCAG AA cần ≥4.5:1 cho text thường, 3:1 cho text lớn. AAA ≥7:1." },
        { q: "Eyedropper hoạt động không?", a: "Hỗ trợ trên Chrome/Edge mới (EyeDropper API). Safari/Firefox chưa hỗ trợ." },
      ],
      en: [
        { q: "What is OKLCH?", a: "A new perceptually uniform color space — more consistent lightness/chroma than HSL, part of CSS Color 4." },
        { q: "What contrast ratio do I need?", a: "WCAG AA requires ≥4.5:1 for normal text and 3:1 for large text. AAA requires ≥7:1." },
        { q: "Does the eyedropper work?", a: "Supported in recent Chrome/Edge (EyeDropper API). Not yet in Safari/Firefox." },
      ],
    },
  },
  {
    href: "/curl",
    iconName: "IconTerminal2",
    title: "cURL Runner",
    desc: { vi: "Dán cURL, xem parse request và response giống Postman.", en: "Paste a cURL command, inspect request and response Postman-style." },
    tags: ["curl", "http", "api"],
    category: "cat_dev",
    seoTitle: "cURL Runner Online - Chạy & Convert cURL Command | FormatBox",
    seoDescription: "Chạy lệnh cURL online, convert sang fetch/axios/Python requests. Test API nhanh không cần cài Postman.",
    seoKeywords: ["curl online", "curl runner", "curl to fetch", "curl to axios", "test api", "curl converter"],
    intro: {
      vi: "cURL Runner cho phép paste lệnh cURL và chạy ngay trên trình duyệt, hoặc convert sang code fetch (JS), axios, Python requests, Node http. Test API nhanh gọn.",
      en: "cURL Runner lets you paste a cURL command and run it in-browser, or convert it to fetch (JS), axios, Python requests, or Node http. A quick way to test APIs.",
    },
    features: {
      vi: ["Chạy cURL trực tiếp", "Convert → fetch / axios / Python", "View response headers & body", "Pretty JSON", "Lưu history", "Hỗ trợ CORS mode"],
      en: ["Run cURL directly", "Convert → fetch / axios / Python", "View response headers & body", "Pretty JSON", "History saved", "CORS mode supported"],
    },
    faqs: {
      vi: [
        { q: "Có chạy được mọi API không?", a: "Giới hạn bởi CORS. Nếu API không bật CORS, request từ browser sẽ fail." },
        { q: "Dữ liệu có bị log không?", a: "Không. Request chạy trong browser hoặc proxy ẩn danh, không lưu." },
        { q: "Convert chính xác không?", a: "Hỗ trợ hầu hết flag thông dụng (-H, -d, -X, -F, --data-binary)." },
      ],
      en: [
        { q: "Does it work with every API?", a: "Bound by CORS. If the API doesn't enable CORS, browser requests will fail." },
        { q: "Is my data logged?", a: "No. Requests run in-browser or via an anonymous proxy; nothing is stored." },
        { q: "Is the conversion accurate?", a: "Most common flags are supported (-H, -d, -X, -F, --data-binary)." },
      ],
    },
  },
  {
    href: "/typing-test",
    iconName: "IconKeyboard",
    title: "Typing Test",
    desc: { vi: "Đo tốc độ gõ WPM & độ chính xác. Đếm giờ, từ tô màu theo lỗi, lưu kỷ lục.", en: "Measure your WPM & accuracy. Timed run, per-word coloring, saved best score." },
    tags: ["typing", "wpm", "keyboard", "speed", "test", "text"],
    category: "cat_text",
    seoTitle: "Test Tốc Độ Gõ Phím - Typing Speed Test | FormatBox",
    seoDescription: "Test tốc độ gõ phím online: WPM, accuracy. Hỗ trợ tiếng Việt và tiếng Anh. Nhiều chế độ: 1 phút, 3 phút, 5 phút.",
    seoKeywords: ["typing test", "test gõ phím", "wpm test", "tốc độ gõ phím", "typing speed", "luyện gõ phím"],
    intro: {
      vi: "Typing Test đo tốc độ gõ phím của bạn (WPM — words per minute) và độ chính xác. Hỗ trợ tiếng Việt (có dấu) và tiếng Anh, nhiều mode thời gian.",
      en: "Typing Test measures your typing speed (WPM — words per minute) and accuracy. Supports Vietnamese (with diacritics) and English with multiple time modes.",
    },
    features: {
      vi: ["WPM & accuracy", "Tiếng Việt có dấu", "Mode 1/3/5 phút", "Nhiều chủ đề văn bản", "Lịch sử điểm", "Chạy offline"],
      en: ["WPM & accuracy", "Vietnamese with diacritics", "1/3/5-minute modes", "Multiple text themes", "Score history", "Runs offline"],
    },
    faqs: {
      vi: [
        { q: "WPM bao nhiêu là nhanh?", a: "40 WPM trung bình, 60+ là nhanh, 80+ là rất nhanh. Chuyên nghiệp 100+." },
        { q: "Có hỗ trợ Telex/VNI không?", a: "Hỗ trợ gõ Unicode trực tiếp, Telex/VNI phụ thuộc bộ gõ hệ thống (Unikey, Laban Key)." },
        { q: "Luyện bao lâu để tăng tốc?", a: "15–30 phút/ngày trong 2–4 tuần có thể tăng 10–20 WPM." },
      ],
      en: [
        { q: "What WPM is considered fast?", a: "40 WPM is average, 60+ is fast, 80+ is very fast. Pros hit 100+." },
        { q: "Does it support Telex/VNI?", a: "It accepts Unicode directly; Telex/VNI depends on your system IME (Unikey, Laban Key)." },
        { q: "How long until I speed up?", a: "15–30 minutes a day for 2–4 weeks can add 10–20 WPM." },
      ],
    },
  },
  {
    href: "/regex",
    iconName: "IconRegex",
    title: "Regex",
    desc: { vi: "Thử regex trực tiếp — chọn flag, xem match highlight và từng group bắt được.", en: "Test regex live — pick flags, highlight matches, inspect captured groups." },
    tags: ["regex", "regexp", "pattern", "match", "test"],
    category: "cat_dev",
    seoTitle: "Regex Tester Online - Regular Expression Debugger | FormatBox",
    seoDescription: "Test và debug regular expression online: match, replace, giải thích pattern, cheatsheet. Hỗ trợ JavaScript regex đầy đủ flags.",
    seoKeywords: ["regex tester", "regular expression", "regex online", "regex debugger", "regex javascript", "regex cheatsheet"],
    intro: {
      vi: "Regex Tester giúp bạn viết, test và debug regular expression ngay trên trình duyệt. Highlight match, hiển thị groups, giải thích pattern bằng tiếng Việt, cheatsheet đầy đủ.",
      en: "Regex Tester lets you write, test, and debug regular expressions right in the browser. Match highlighting, group display, pattern explanation, and a complete cheatsheet.",
    },
    features: {
      vi: ["Match & replace realtime", "Highlight match & groups", "Giải thích pattern", "Flags: g, i, m, s, u", "Cheatsheet đi kèm", "Lưu pattern yêu thích"],
      en: ["Realtime match & replace", "Highlight matches & groups", "Pattern explanation", "Flags: g, i, m, s, u", "Built-in cheatsheet", "Save favorite patterns"],
    },
    faqs: {
      vi: [
        { q: "Hỗ trợ regex flavor nào?", a: "JavaScript regex (ECMAScript). Khác đôi chút với PCRE (PHP), Python re." },
        { q: "Lookbehind có hoạt động không?", a: "Có trên Chrome/Firefox/Edge mới. Safari cũ có thể không hỗ trợ." },
        { q: "Backtracking catastrophic là gì?", a: "Pattern tệ như `(a+)+b` có thể treo trình duyệt với input dài — tránh nested quantifier." },
      ],
      en: [
        { q: "Which regex flavor is supported?", a: "JavaScript regex (ECMAScript). Slightly different from PCRE (PHP) and Python re." },
        { q: "Does lookbehind work?", a: "Yes in recent Chrome/Firefox/Edge. Older Safari may not support it." },
        { q: "What is catastrophic backtracking?", a: "Bad patterns like `(a+)+b` can hang the browser on long inputs — avoid nested quantifiers." },
      ],
    },
  },
  {
    href: "/uuid",
    iconName: "IconFingerprint",
    title: "UUID",
    desc: { vi: "Tạo UUID v4 ngẫu nhiên. Sinh hàng loạt, tuỳ chỉnh định dạng, copy một chạm.", en: "Generate random UUID v4. Batch create, customize format, one-click copy." },
    tags: ["uuid", "guid", "random", "id", "unique"],
    category: "cat_dev",
    seoTitle: "Tạo UUID Online - UUID v4, v1 Generator | FormatBox",
    seoDescription: "Tạo UUID (GUID) online miễn phí. Hỗ trợ UUID v4 random, v1 time-based. Tạo hàng loạt, copy nhanh. Chuẩn RFC 4122, không giới hạn số lượng.",
    seoKeywords: ["tạo uuid", "uuid generator", "uuid v4", "guid generator", "uuid online", "random uuid", "tạo guid", "uuid v1"],
    intro: {
      vi: "UUID (Universally Unique Identifier) là chuỗi 128-bit dùng làm ID duy nhất toàn cầu, phổ biến cho primary key database, request ID, file ID. Tool hỗ trợ sinh UUID v4 (random) và v1 (time + MAC), tạo đơn lẻ hoặc hàng loạt, chuẩn RFC 4122.",
      en: "UUID (Universally Unique Identifier) is a 128-bit globally unique ID commonly used for database primary keys, request IDs, and file IDs. This tool generates UUID v4 (random) and v1 (time + MAC), one at a time or in bulk, per RFC 4122.",
    },
    features: {
      vi: ["UUID v4 random (phổ biến nhất)", "UUID v1 dựa trên thời gian", "Tạo hàng loạt 1–1000 UUID một lần", "Format uppercase/lowercase, có/không dấu gạch", "Copy một UUID hoặc toàn bộ danh sách", "Chuẩn RFC 4122, chạy offline"],
      en: ["UUID v4 random (most common)", "UUID v1 time-based", "Bulk generate 1–1000 UUIDs at once", "Upper/lowercase, with/without dashes", "Copy a single UUID or the full list", "RFC 4122 compliant, runs offline"],
    },
    faqs: {
      vi: [
        { q: "UUID có thật sự duy nhất 100%?", a: "Về lý thuyết có xác suất trùng nhưng cực kỳ nhỏ: với UUID v4, bạn phải tạo ~2.71 tỷ tỷ UUID mới có 50% khả năng trùng. Thực tế coi như duy nhất." },
        { q: "Nên dùng v4 hay v1?", a: "Dùng v4 (random) cho hầu hết trường hợp. V1 (time-based) khi cần sort theo thời gian tạo, nhưng v1 có thể lộ MAC address." },
        { q: "UUID có dùng làm password được không?", a: "Không nên. UUID v4 có 122 bit random, đủ mạnh cho ID nhưng không phải chuẩn thiết kế cho mật khẩu/token bảo mật." },
      ],
      en: [
        { q: "Are UUIDs truly 100% unique?", a: "In theory there's a tiny collision chance: for UUID v4 you'd need ~2.71 quintillion UUIDs for a 50% chance of a duplicate. In practice they're unique." },
        { q: "Should I use v4 or v1?", a: "Use v4 (random) for most cases. Use v1 (time-based) when you need creation-time sorting — but v1 can expose a MAC address." },
        { q: "Can I use a UUID as a password?", a: "Not recommended. UUID v4 has 122 random bits — strong enough as an ID but not designed as a secure password/token." },
      ],
    },
  },
  {
    href: "/meme",
    iconName: "IconMoodSmile",
    title: "Meme",
    desc: { vi: "Lướt meme đang trending — xem, copy ảnh, tải về. Nguồn từ các cộng đồng meme lớn trên Reddit.", en: "Browse trending memes — preview, copy image, download. Sourced from large Reddit meme communities." },
    tags: ["meme", "funny", "reddit", "image", "gif", "viral"],
    category: "cat_media",
    seoTitle: "Meme Generator Online - Tạo Meme Miễn Phí | FormatBox",
    seoDescription: "Meme generator online: tạo meme từ template có sẵn hoặc upload ảnh. Thêm text, caption, download PNG. Miễn phí, không watermark.",
    seoKeywords: ["meme generator", "tạo meme", "meme online", "meme template", "chế ảnh meme", "meme miễn phí"],
    intro: {
      vi: "Meme Generator cho phép tạo meme nhanh từ template có sẵn hoặc ảnh của bạn. Thêm text trên/dưới hoặc tự do, chọn font Impact chuẩn meme, download PNG không watermark.",
      en: "Meme Generator makes memes fast from built-in templates or your own image. Top/bottom or free-form text, the classic Impact font, and watermark-free PNG downloads.",
    },
    features: {
      vi: ["100+ template meme phổ biến", "Upload ảnh của bạn", "Text đa vị trí", "Font & màu tùy chỉnh", "Preview realtime", "Download PNG không watermark"],
      en: ["100+ popular meme templates", "Upload your own image", "Multi-position text", "Custom font & color", "Realtime preview", "Watermark-free PNG download"],
    },
    faqs: {
      vi: [
        { q: "Có watermark không?", a: "Không, meme download sạch không có logo FormatBox." },
        { q: "Dùng cho mục đích thương mại được không?", a: "Template meme phổ biến thường là public domain; ảnh của bạn thì do bạn sở hữu." },
        { q: "Có hỗ trợ GIF meme không?", a: "Hiện tại chỉ hỗ trợ PNG/JPG, chưa animate GIF." },
      ],
      en: [
        { q: "Any watermark?", a: "No — downloads are clean, no FormatBox logo." },
        { q: "Can I use memes commercially?", a: "Popular meme templates are usually public domain; images you upload are yours." },
        { q: "Are GIF memes supported?", a: "Currently PNG/JPG only; animated GIFs are not yet supported." },
      ],
    },
  },
  {
    href: "/travel-plan",
    iconName: "IconRoute",
    title: "Lộ trình",
    desc: { vi: "Dựng lộ trình du lịch theo ngày — chọn tông màu, địa điểm kèm hình tự tìm, tải ảnh hoặc tạo link chia sẻ.", en: "Build a day-by-day travel itinerary — pick a colour tone, add places with auto-fetched photos, download or share a link." },
    tags: ["travel", "trip", "itinerary", "du-lich", "lo-trinh", "plan", "map"],
    category: "cat_life",
    seoTitle: "Lộ Trình Du Lịch - Lập Kế Hoạch Chuyến Đi | FormatBox",
    seoDescription: "Lập lộ trình du lịch chi tiết: điểm đến, thời gian, chi phí, note. Chia sẻ kế hoạch với bạn bè qua link.",
    seoKeywords: ["lộ trình du lịch", "travel plan", "kế hoạch du lịch", "itinerary", "lịch trình chuyến đi"],
    intro: {
      vi: "Travel Plan giúp bạn lập lộ trình chuyến đi chi tiết theo ngày: điểm đến, thời gian, chi phí dự kiến, note cá nhân. Chia sẻ với nhóm bạn qua link, không cần đăng ký.",
      en: "Travel Plan builds a day-by-day itinerary: destinations, times, estimated costs, and personal notes. Share with friends via a link, no sign-up required.",
    },
    features: {
      vi: ["Lộ trình theo ngày", "Dự toán chi phí", "Ghi chú từng điểm", "Chia sẻ qua link", "In ra giấy", "Lưu local"],
      en: ["Day-by-day itinerary", "Cost estimates", "Per-stop notes", "Share via link", "Printable", "Saved locally"],
    },
    faqs: {
      vi: [
        { q: "Có kết nối Google Maps không?", a: "Mỗi điểm có thể copy ra Maps dễ dàng; chưa tích hợp trực tiếp." },
        { q: "Chia sẻ nhóm sửa chung được không?", a: "Hiện tại chia sẻ dạng xem; chỉnh sửa cộng tác đang phát triển." },
        { q: "Dữ liệu có lưu lâu không?", a: "Lưu trong localStorage trình duyệt — xóa cache sẽ mất." },
      ],
      en: [
        { q: "Does it connect to Google Maps?", a: "Each stop can be copied to Maps easily; direct integration isn't available yet." },
        { q: "Can my group edit together?", a: "Currently view-only sharing; collaborative editing is in progress." },
        { q: "How long is my data kept?", a: "In the browser's localStorage — clearing the cache removes it." },
      ],
    },
  },
  {
    href: "/license-plate",
    iconName: "IconCar",
    title: "Biển số xe",
    desc: { vi: "Nhập biển số (vd 51K-123.45) hoặc tên tỉnh — hiển thị mã, vùng và danh sách đầy đủ 63 tỉnh/thành.", en: "Type a plate (e.g. 51K-123.45) or a province — see code, region and the full list of 63 provinces." },
    tags: ["bien so", "license", "plate", "vietnam", "tinh", "province", "xe"],
    category: "cat_life",
    seoTitle: "Tra Biển Số Xe - Biển Số Các Tỉnh Việt Nam | FormatBox",
    seoDescription: "Tra cứu biển số xe Việt Nam: biển số tỉnh/thành, mã quận huyện, loại xe. Nhận diện biển ngũ quý, biển tam hoa, biển sảnh.",
    seoKeywords: ["tra biển số xe", "biển số xe", "biển số tỉnh", "biển ngũ quý", "biển số đẹp", "mã biển số"],
    intro: {
      vi: "Tra cứu biển số xe máy, ô tô Việt Nam: xem thuộc tỉnh/thành nào, loại xe (cá nhân, kinh doanh, nhà nước, quân đội). Phân tích biển đẹp: ngũ quý, tam hoa, sảnh tiến.",
      en: "Look up Vietnamese motorcycle/car license plates: which province, vehicle type (personal, commercial, state, military). Spot lucky plates: five-of-a-kind, three-of-a-kind, and ascending sequences.",
    },
    features: {
      vi: ["63 tỉnh/thành đầy đủ", "Phân biệt loại xe", "Nhận diện biển đẹp", "Lịch sử tra cứu", "Giải thích chữ cái biển", "Miễn phí"],
      en: ["All 63 provinces", "Distinguish vehicle types", "Detect lucky plates", "Lookup history", "Explain plate letters", "Free"],
    },
    faqs: {
      vi: [
        { q: "Biển trắng/vàng/xanh khác gì?", a: "Trắng: cá nhân; vàng: xe kinh doanh; xanh: cơ quan nhà nước; đỏ: quân đội." },
        { q: "Có tra chủ xe được không?", a: "Không. Thông tin chủ xe là dữ liệu riêng tư, chỉ cơ quan chức năng truy cập." },
        { q: "Biển ngũ quý là gì?", a: "5 số giống nhau liên tiếp (ví dụ 11111, 88888) — thuộc nhóm biển siêu đẹp." },
      ],
      en: [
        { q: "What do white/yellow/blue plates mean?", a: "White: personal; yellow: commercial; blue: state agency; red: military." },
        { q: "Can I look up the owner?", a: "No. Owner information is private and accessible only to authorities." },
        { q: "What is a 'ngu quy' plate?", a: "Five identical digits in a row (e.g., 11111, 88888) — a highly prized plate." },
      ],
    },
  },
];

// Map from slug (href without leading "/") to tool, used by SEO helpers.
const TOOL_BY_SLUG: Record<string, Tool> = Object.fromEntries(
  SEED_TOOLS.map((t) => [t.href.replace(/^\//, ""), t]),
);

// Slugs ("/foo") whose landing page has its own SEO metadata; used by
// TitleUpdater to avoid overriding server-rendered <title>.
export const SEO_SLUGS: ReadonlySet<string> = new Set(
  SEED_TOOLS.filter((t) => t.seoTitle).map((t) => t.href),
);

export function toolBySlug(slug: string): Tool | undefined {
  return TOOL_BY_SLUG[slug.replace(/^\//, "")];
}

export function toolMetadata(slug: string): Metadata {
  const t = toolBySlug(slug);
  if (!t) return {};
  const url = `${SITE_URL}${t.href}`;
  const title = t.seoTitle ?? t.title;
  const description = t.seoDescription ?? t.desc.vi;
  return {
    title,
    description,
    keywords: t.seoKeywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "FormatBox",
      type: "website",
      locale: "vi_VN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function toolJsonLd(slug: string) {
  const t = toolBySlug(slug);
  if (!t) return [];
  const url = `${SITE_URL}${t.href}`;
  const title = t.seoTitle ?? t.title;
  const description = t.seoDescription ?? t.desc.vi;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: title.split(" | ")[0],
      url,
      description,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "FormatBox", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (t.faqs?.vi ?? []).map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
}
