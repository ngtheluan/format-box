import type { Metadata } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://formatbox.site").replace(/\/$/, "");

export type ToolSeo = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  intro: string;
  features: string[];
  faqs: { q: string; a: string }[];
};

export const TOOL_SEO: Record<string, ToolSeo> = {
  json: {
    slug: "/json",
    title: "Format JSON Online - Validate, Minify & Tree View Miễn Phí | FormatBox",
    description:
      "Công cụ format JSON online miễn phí: beautify, minify, validate, xem tree view, đếm keys, đo kích thước. Xử lý 100% trên trình duyệt, không gửi dữ liệu lên server.",
    keywords: [
      "format json",
      "json formatter",
      "json online",
      "json validator",
      "json beautify",
      "json minify",
      "json viewer",
      "format json online",
      "kiểm tra json",
      "định dạng json",
    ],
    intro:
      "JSON Formatter là công cụ giúp bạn format (làm đẹp), minify (nén), và validate (kiểm tra lỗi) chuỗi JSON ngay trên trình duyệt. Tool hỗ trợ tree view để duyệt cấu trúc lồng nhau, đếm số lượng key, và đo kích thước dữ liệu — tất cả xử lý client-side, không upload file lên server.",
    features: [
      "Format JSON với indent 2/4 spaces hoặc tab",
      "Minify JSON để giảm kích thước",
      "Validate và báo lỗi với vị trí dòng/cột",
      "Tree view tương tác, có thể fold/expand",
      "Đếm số keys, arrays, kích thước byte",
      "Hoạt động 100% offline — bảo mật dữ liệu tuyệt đối",
    ],
    faqs: [
      {
        q: "Dữ liệu JSON của tôi có bị gửi lên server không?",
        a: "Không. FormatBox JSON Tool xử lý hoàn toàn trong trình duyệt (client-side). Dữ liệu không bao giờ rời khỏi máy bạn, đảm bảo bảo mật cho dữ liệu nhạy cảm.",
      },
      {
        q: "Có giới hạn kích thước JSON không?",
        a: "Giới hạn phụ thuộc vào RAM trình duyệt. Thực tế bạn có thể format file JSON vài chục MB mượt mà.",
      },
      {
        q: "Tool có miễn phí không?",
        a: "Hoàn toàn miễn phí, không cần đăng ký, không có quảng cáo, không giới hạn số lần sử dụng.",
      },
    ],
  },
  base64: {
    slug: "/base64",
    title: "Base64 Encode & Decode Online - Text, File, UTF-8 | FormatBox",
    description:
      "Mã hóa và giải mã Base64 online miễn phí. Hỗ trợ text, file nhị phân, UTF-8 đầy đủ. Kéo thả file, đổi chiều một chạm. Xử lý 100% trên trình duyệt.",
    keywords: [
      "base64",
      "base64 encode",
      "base64 decode",
      "mã hóa base64",
      "giải mã base64",
      "base64 online",
      "base64 to text",
      "base64 to file",
      "base64 image",
    ],
    intro:
      "Base64 là chuẩn mã hóa chuyển dữ liệu nhị phân thành chuỗi ký tự ASCII, thường dùng để nhúng ảnh vào HTML/CSS, truyền file qua JSON API, hoặc lưu trong URL. Tool của FormatBox hỗ trợ encode/decode cả text và file (kéo thả), xử lý UTF-8 chính xác, chạy hoàn toàn offline.",
    features: [
      "Encode / decode text với UTF-8 đầy đủ",
      "Kéo thả file để encode nhanh",
      "Decode base64 thành file download",
      "Nút đổi chiều Encode ⇄ Decode một chạm",
      "Preview ảnh base64 trực tiếp",
      "Không giới hạn kích thước (tùy RAM trình duyệt)",
    ],
    faqs: [
      {
        q: "Base64 có phải là mã hóa bảo mật không?",
        a: "Không. Base64 chỉ là biểu diễn (encoding), ai cũng có thể decode được. Nó không bảo mật dữ liệu — nếu cần bảo mật hãy dùng mã hóa thực sự như AES.",
      },
      {
        q: "Có upload file lên server không?",
        a: "Không. Toàn bộ encode/decode diễn ra trong trình duyệt. File của bạn không rời khỏi máy.",
      },
      {
        q: "Tại sao chuỗi base64 dài hơn text gốc?",
        a: "Base64 dùng 4 ký tự để biểu diễn 3 byte, nên output luôn lớn hơn ~33% so với dữ liệu gốc.",
      },
    ],
  },
  qr: {
    slug: "/qr",
    title: "Tạo Mã QR Online Miễn Phí - QR Code Generator | FormatBox",
    description:
      "Tạo mã QR online miễn phí cho URL, text, WiFi, vCard. Tùy chỉnh màu, logo, mức sửa lỗi. Download PNG/SVG chất lượng cao. Không watermark, không giới hạn.",
    keywords: [
      "tạo mã qr",
      "qr code generator",
      "tạo qr online",
      "qr miễn phí",
      "qr code wifi",
      "qr vcard",
      "qr code png",
      "qr code svg",
      "tạo mã qr code",
    ],
    intro:
      "Tool tạo mã QR online miễn phí hỗ trợ URL, text, số điện thoại, email, WiFi, vCard. Tùy chỉnh màu sắc, mức error correction, download dưới dạng PNG hoặc SVG. Toàn bộ generate trên trình duyệt, không gửi dữ liệu đi đâu.",
    features: [
      "Tạo QR cho URL, text, WiFi, vCard, email, SMS",
      "Tùy chỉnh màu nền và màu mã",
      "4 mức sửa lỗi: L, M, Q, H",
      "Export PNG high-res hoặc SVG vector",
      "Preview realtime khi nhập",
      "Không watermark, không logo bắt buộc",
    ],
    faqs: [
      {
        q: "Mã QR tôi tạo có hết hạn không?",
        a: "Không. QR được tạo offline trên trình duyệt — nó là một ảnh vĩnh viễn, không phụ thuộc vào server nào cả.",
      },
      {
        q: "Có thể tạo QR cho WiFi được không?",
        a: "Có. Chọn loại WiFi, nhập SSID, mật khẩu, loại mã hóa — QR tạo ra sẽ cho điện thoại tự động kết nối khi quét.",
      },
      {
        q: "Mức error correction nên chọn gì?",
        a: "Mức M (15%) cho hầu hết trường hợp. Chọn H (30%) nếu dán logo lên QR hoặc in trên bề mặt dễ bẩn/mờ.",
      },
    ],
  },
  jwt: {
    slug: "/jwt",
    title: "JWT Decoder Online - Giải mã JSON Web Token | FormatBox",
    description:
      "Decode và kiểm tra JWT (JSON Web Token) online. Xem header, payload, signature. Validate thời gian hết hạn. Xử lý client-side, token không gửi lên server.",
    keywords: [
      "jwt decoder",
      "giải mã jwt",
      "jwt online",
      "json web token",
      "decode jwt",
      "jwt validator",
      "jwt debugger",
      "parse jwt",
    ],
    intro:
      "JWT Decoder giúp bạn phân tích JSON Web Token: giải mã header và payload (base64url), kiểm tra thời gian hết hạn (exp), issued at (iat), và các claim khác. Tool chạy hoàn toàn trong trình duyệt — token nhạy cảm không bao giờ gửi đi đâu.",
    features: [
      "Decode header & payload JWT",
      "Hiển thị claims chuẩn: exp, iat, iss, sub, aud",
      "Cảnh báo token đã hết hạn",
      "Pretty-print JSON output",
      "Copy từng phần một chạm",
      "An toàn: xử lý 100% trên trình duyệt",
    ],
    faqs: [
      {
        q: "Dán JWT của tôi có an toàn không?",
        a: "An toàn. Tool chỉ decode trong trình duyệt — token không được gửi lên server của FormatBox hay bất kỳ bên thứ ba nào.",
      },
      {
        q: "Có verify được signature không?",
        a: "Việc verify signature cần secret/public key của hệ thống phát hành. Tool hiện tại chỉ decode để xem nội dung, không thực hiện xác thực chữ ký.",
      },
      {
        q: "JWT khác gì session cookie truyền thống?",
        a: "JWT là stateless — server không cần lưu session, mọi thông tin đóng gói trong token và được ký để chống giả mạo. Phù hợp cho API và microservices.",
      },
    ],
  },
  uuid: {
    slug: "/uuid",
    title: "Tạo UUID Online - UUID v4, v1 Generator | FormatBox",
    description:
      "Tạo UUID (GUID) online miễn phí. Hỗ trợ UUID v4 random, v1 time-based. Tạo hàng loạt, copy nhanh. Chuẩn RFC 4122, không giới hạn số lượng.",
    keywords: [
      "tạo uuid",
      "uuid generator",
      "uuid v4",
      "guid generator",
      "uuid online",
      "random uuid",
      "tạo guid",
      "uuid v1",
    ],
    intro:
      "UUID (Universally Unique Identifier) là chuỗi 128-bit dùng làm ID duy nhất toàn cầu, phổ biến cho primary key database, request ID, file ID. Tool hỗ trợ sinh UUID v4 (random) và v1 (time + MAC), tạo đơn lẻ hoặc hàng loạt, chuẩn RFC 4122.",
    features: [
      "UUID v4 random (phổ biến nhất)",
      "UUID v1 dựa trên thời gian",
      "Tạo hàng loạt 1–1000 UUID một lần",
      "Format uppercase/lowercase, có/không dấu gạch",
      "Copy một UUID hoặc toàn bộ danh sách",
      "Chuẩn RFC 4122, chạy offline",
    ],
    faqs: [
      {
        q: "UUID có thật sự duy nhất 100%?",
        a: "Về lý thuyết có xác suất trùng nhưng cực kỳ nhỏ: với UUID v4, bạn phải tạo ~2.71 tỷ tỷ UUID mới có 50% khả năng trùng. Thực tế coi như duy nhất.",
      },
      {
        q: "Nên dùng v4 hay v1?",
        a: "Dùng v4 (random) cho hầu hết trường hợp. V1 (time-based) khi cần sort theo thời gian tạo, nhưng v1 có thể lộ MAC address.",
      },
      {
        q: "UUID có dùng làm password được không?",
        a: "Không nên. UUID v4 có 122 bit random, đủ mạnh cho ID nhưng không phải chuẩn thiết kế cho mật khẩu/token bảo mật.",
      },
    ],
  },
};

// ===== Batch 2 =====
Object.assign(TOOL_SEO, {
  graph: {
    slug: "/graph",
    title: "JSON Graph Viewer - Visualize JSON thành đồ thị | FormatBox",
    description:
      "Chuyển JSON thành đồ thị tương tác (interactive graph). Pan, zoom, khám phá cấu trúc lồng nhau. Miễn phí, chạy 100% trên trình duyệt.",
    keywords: ["json graph", "json visualizer", "json viewer", "json tree", "visualize json", "json diagram"],
    intro:
      "JSON Graph biến dữ liệu JSON phức tạp thành đồ thị trực quan: mỗi object/array là một node, các mối quan hệ hiển thị dưới dạng cạnh nối. Phù hợp khi debug API response, phân tích cấu trúc dữ liệu lồng sâu, hoặc giải thích schema cho team.",
    features: ["Pan & zoom mượt", "Fold/expand node", "Highlight path khi click", "Export ảnh graph", "Xử lý JSON lớn", "Chạy offline"],
    faqs: [
      { q: "Hỗ trợ file JSON lớn không?", a: "Có, giới hạn phụ thuộc RAM trình duyệt. Vài MB chạy mượt." },
      { q: "Có upload dữ liệu lên server không?", a: "Không. Tất cả render client-side." },
      { q: "Export được graph không?", a: "Có, bạn có thể screenshot hoặc dùng tính năng export ảnh." },
    ],
  },
  image: {
    slug: "/image",
    title: "Image Converter Online - Chuyển đổi ảnh JPG, PNG, WebP, AVIF | FormatBox",
    description:
      "Chuyển đổi ảnh online: JPG, PNG, WebP, AVIF. Resize, nén, đổi định dạng hàng loạt. Xử lý trên trình duyệt, không upload server.",
    keywords: ["chuyển đổi ảnh", "image converter", "jpg to png", "png to webp", "convert image", "resize ảnh", "nén ảnh online"],
    intro:
      "Image Converter cho phép đổi định dạng ảnh (JPG, PNG, WebP, AVIF), resize, nén chất lượng — tất cả xử lý ngay trên trình duyệt bằng Canvas API. Ảnh không được upload lên server, bảo mật tuyệt đối.",
    features: ["Hỗ trợ JPG/PNG/WebP/AVIF", "Resize theo chiều rộng/cao", "Điều chỉnh chất lượng nén", "Xử lý hàng loạt", "Kéo thả nhiều file", "Download từng file hoặc ZIP"],
    faqs: [
      { q: "Ảnh có bị gửi lên server không?", a: "Không. Convert bằng Canvas API ngay trên trình duyệt." },
      { q: "AVIF có hỗ trợ mọi trình duyệt không?", a: "Chrome, Firefox, Safari mới hỗ trợ encode AVIF. Trình duyệt cũ sẽ không chạy được." },
      { q: "Chất lượng nên để bao nhiêu?", a: "80–85% là cân bằng tốt giữa kích thước và chất lượng cho web." },
    ],
  },
  photobooth: {
    slug: "/photobooth",
    title: "Photobooth Online - Chụp ảnh webcam có hiệu ứng | FormatBox",
    description:
      "Photobooth online miễn phí: chụp ảnh webcam với filter, sticker, khung ảnh. Ghép strip 4 ảnh, download chất lượng cao. Chạy 100% trên trình duyệt.",
    keywords: ["photobooth online", "chụp ảnh webcam", "photo strip", "webcam filter", "photobooth miễn phí", "4 cut photo"],
    intro:
      "Photobooth online cho phép dùng webcam chụp ảnh với nhiều filter, sticker, và ghép thành photo strip 4 ô theo phong cách Hàn Quốc. Không cần cài app, chạy ngay trên trình duyệt.",
    features: ["Filter màu đa dạng", "Sticker và khung ảnh", "Ghép strip 2/4/6 ảnh", "Đếm ngược trước khi chụp", "Download PNG chất lượng cao", "Không lưu ảnh lên server"],
    faqs: [
      { q: "Ảnh của tôi có bị gửi đi đâu không?", a: "Không. Ảnh xử lý và lưu trong trình duyệt của bạn." },
      { q: "Cần cho phép webcam không?", a: "Có, bạn cần cấp quyền camera để tool hoạt động." },
      { q: "Dùng trên điện thoại được không?", a: "Được, hỗ trợ camera trước và sau trên mobile." },
    ],
  },
  "audio-studio": {
    slug: "/audio-studio",
    title: "Audio Studio Online - Cắt, ghép, chuyển định dạng audio | FormatBox",
    description:
      "Audio Studio online: cắt, ghép, chuyển MP3, WAV, OGG, điều chỉnh âm lượng. Xử lý ngay trên trình duyệt, không upload file.",
    keywords: ["cắt nhạc online", "ghép audio", "chuyển mp3", "audio editor online", "mp3 cutter", "audio converter"],
    intro:
      "Audio Studio là bộ công cụ xử lý âm thanh online: cắt đoạn, ghép nhiều file, chuyển định dạng (MP3, WAV, OGG), điều chỉnh volume. Chạy bằng Web Audio API ngay trên trình duyệt.",
    features: ["Cắt audio theo waveform", "Ghép nhiều file", "Convert MP3 ⇄ WAV ⇄ OGG", "Điều chỉnh âm lượng", "Fade in/out", "Không upload file"],
    faqs: [
      { q: "Có upload nhạc lên server không?", a: "Không, mọi xử lý diễn ra trong trình duyệt." },
      { q: "File audio tối đa bao nhiêu?", a: "Phụ thuộc RAM — thực tế vài trăm MB chạy mượt." },
      { q: "Có hỗ trợ MP3 không?", a: "Có, decode và encode MP3 đều hỗ trợ." },
    ],
  },
  "favicon-export": {
    slug: "/favicon-export",
    title: "Favicon Generator - Tạo favicon từ ảnh hoặc text | FormatBox",
    description:
      "Tạo favicon đầy đủ sizes (16, 32, 180, 192, 512) từ ảnh hoặc text. Export ICO, PNG, Apple touch icon, manifest. Chuẩn web hiện đại.",
    keywords: ["favicon generator", "tạo favicon", "favicon.ico", "apple touch icon", "web manifest", "favicon png"],
    intro:
      "Favicon Export tạo bộ favicon đầy đủ (ICO, PNG đa kích thước, Apple touch icon, Android chrome, web manifest) từ ảnh upload hoặc text/emoji. Dán HTML snippet vào thẻ <head> là xong.",
    features: ["ICO + PNG nhiều kích thước", "Apple Touch Icon 180×180", "Android/Chrome 192 & 512", "Web manifest JSON", "HTML snippet có sẵn", "Export ZIP"],
    faqs: [
      { q: "Favicon nên dùng kích thước nào?", a: "Tối thiểu 32×32 cho tab, 180×180 cho Apple, 512×512 cho PWA." },
      { q: "ICO vs PNG khác gì?", a: "ICO là format cũ cho Windows/IE; trình duyệt hiện đại dùng PNG. Có cả 2 là an toàn nhất." },
      { q: "Có cần web manifest không?", a: "Cần nếu bạn muốn site cài được như PWA trên mobile." },
    ],
  },
  bill: {
    slug: "/bill",
    title: "Chia Hóa Đơn Online - Bill Splitter Nhóm Bạn | FormatBox",
    description:
      "Chia hóa đơn công bằng cho nhóm bạn ăn uống, du lịch. Tính tip, VAT, chia theo món, ai đã trả hộ. Miễn phí, không cần đăng ký.",
    keywords: ["chia hóa đơn", "bill splitter", "tính tiền nhóm", "chia tiền ăn", "split bill", "tính tip"],
    intro:
      "Bill Splitter giúp chia hóa đơn công bằng cho nhóm: nhập danh sách món, chọn ai ăn món nào, thêm tip và VAT — tool tự tính ai nợ ai bao nhiêu. Phù hợp đi ăn, du lịch, tiệc nhóm.",
    features: ["Chia theo món hoặc đều", "Thêm tip & VAT tự động", "Tính ai trả hộ cho ai", "Hỗ trợ nhiều người", "Export kết quả", "Chạy offline"],
    faqs: [
      { q: "Có hỗ trợ chia không đều không?", a: "Có, bạn chọn ai ăn món nào, tool tự tính phần của mỗi người." },
      { q: "Dữ liệu có lưu không?", a: "Chỉ lưu trong trình duyệt (localStorage), không gửi server." },
      { q: "Có app mobile không?", a: "Chưa, nhưng web chạy tốt trên điện thoại." },
    ],
  },
  markdown: {
    slug: "/markdown",
    title: "Markdown Editor & Preview Online - Live Preview | FormatBox",
    description:
      "Markdown editor online với live preview, hỗ trợ GFM, bảng, code highlight, math. Export HTML, PDF. Không cần cài app.",
    keywords: ["markdown editor", "markdown preview", "markdown online", "md to html", "markdown viewer", "github markdown"],
    intro:
      "Markdown Reader cho phép viết markdown với live preview, hỗ trợ GitHub Flavored Markdown (bảng, task list, code fence), syntax highlight, math (KaTeX). Export HTML hoặc PDF chỉ với 1 click.",
    features: ["Live preview song song", "GFM đầy đủ (bảng, checklist)", "Syntax highlight 100+ ngôn ngữ", "Math (KaTeX)", "Export HTML/PDF", "Lưu bản nháp local"],
    faqs: [
      { q: "Có hỗ trợ Mermaid không?", a: "Có, viết ```mermaid``` block để render diagram." },
      { q: "File markdown có lưu lại không?", a: "Lưu trong localStorage trình duyệt, không mất khi reload." },
      { q: "Export PDF được không?", a: "Được, dùng chức năng Print → Save as PDF của trình duyệt." },
    ],
  },
  "text-case": {
    slug: "/text-case",
    title: "Chuyển Đổi Chữ Hoa Thường Online - Text Case Converter | FormatBox",
    description:
      "Chuyển đổi text giữa UPPERCASE, lowercase, Title Case, camelCase, snake_case, kebab-case, PascalCase. Miễn phí, nhanh gọn.",
    keywords: ["chuyển chữ hoa", "text case", "camelcase", "snake case", "kebab case", "uppercase lowercase", "chữ hoa chữ thường"],
    intro:
      "Text Case Converter đổi text sang mọi dạng chữ: UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE. Hỗ trợ tiếng Việt có dấu.",
    features: ["12+ kiểu case", "Hỗ trợ tiếng Việt có dấu", "Chuyển hàng loạt", "Preview realtime", "Copy một chạm", "Chạy offline"],
    faqs: [
      { q: "Có hỗ trợ tiếng Việt không?", a: "Có, xử lý Unicode chuẩn, giữ nguyên dấu khi đổi hoa/thường." },
      { q: "camelCase vs PascalCase khác gì?", a: "camelCase chữ đầu thường (myVariable), PascalCase chữ đầu hoa (MyClass)." },
      { q: "Dùng để làm gì?", a: "Phổ biến khi code (biến, class, file), SEO slug, chuẩn hóa data." },
    ],
  },
  responsive: {
    slug: "/responsive",
    title: "Responsive Tester - Test giao diện web nhiều kích thước | FormatBox",
    description:
      "Test responsive website trên nhiều thiết bị cùng lúc: iPhone, iPad, desktop, Android. Preview đa viewport, chụp screenshot.",
    keywords: ["responsive tester", "test responsive", "mobile preview", "viewport tester", "test giao diện mobile"],
    intro:
      "Responsive Tester mở website trong nhiều viewport cùng lúc (mobile, tablet, desktop) để kiểm tra giao diện responsive. Chọn thiết bị preset hoặc tự nhập kích thước.",
    features: ["Preset: iPhone, iPad, Android, Desktop", "Custom kích thước", "Side-by-side nhiều viewport", "Scroll đồng bộ", "Rotate landscape/portrait", "URL nào cũng test được"],
    faqs: [
      { q: "Có test được localhost không?", a: "Chỉ test được URL public (do browser không cho iframe localhost từ domain khác)." },
      { q: "Có screenshot được không?", a: "Dùng công cụ screenshot của OS/trình duyệt để chụp." },
      { q: "Site chặn iframe thì sao?", a: "Site set X-Frame-Options: DENY sẽ không hiển thị được trong tool." },
    ],
  },
  fuel: {
    slug: "/fuel",
    title: "Giá Xăng Dầu Hôm Nay - Cập Nhật Mới Nhất | FormatBox",
    description:
      "Giá xăng dầu hôm nay: RON 95, RON 92, dầu diesel, dầu hỏa. Cập nhật theo đợt điều chỉnh mới nhất của Petrolimex, PVOil.",
    keywords: ["giá xăng hôm nay", "giá xăng", "giá dầu", "ron 95", "giá xăng dầu", "petrolimex", "giá xăng mới nhất"],
    intro:
      "Trang cập nhật giá xăng dầu Việt Nam mới nhất theo mỗi đợt điều chỉnh (15 ngày/lần). Hiển thị giá RON 95, RON 92/E5, dầu diesel, dầu hỏa, so sánh với kỳ trước.",
    features: ["Giá cập nhật mới nhất", "RON 95, E5 RON 92, diesel, dầu hỏa", "So sánh với kỳ trước", "Lịch sử điều chỉnh", "Dữ liệu Petrolimex", "Miễn phí"],
    faqs: [
      { q: "Giá cập nhật bao lâu một lần?", a: "Theo quy định mới, 15 ngày điều chỉnh một lần vào thứ Năm." },
      { q: "Nguồn dữ liệu từ đâu?", a: "Từ Petrolimex và các công bố chính thức của liên Bộ Công Thương - Tài chính." },
      { q: "Giá có khác nhau giữa các vùng?", a: "Vùng 2 (miền núi, hải đảo) cao hơn vùng 1 do phụ thu vận chuyển." },
    ],
  },
  "exchange-currency": {
    slug: "/exchange-currency",
    title: "Tỷ Giá Ngoại Tệ Hôm Nay - USD, EUR, JPY, KRW | FormatBox",
    description:
      "Tỷ giá ngoại tệ cập nhật realtime: USD, EUR, JPY, KRW, CNY, GBP. Tính chuyển đổi nhanh. Dữ liệu từ Vietcombank và các ngân hàng.",
    keywords: ["tỷ giá hôm nay", "tỷ giá usd", "quy đổi tiền", "exchange rate", "tỷ giá vietcombank", "chuyển đổi tiền tệ"],
    intro:
      "Tỷ giá ngoại tệ cập nhật từ các ngân hàng lớn (Vietcombank, BIDV, Techcombank). Hỗ trợ 20+ loại tiền, tính chuyển đổi 2 chiều ngay, so sánh tỷ giá mua/bán.",
    features: ["20+ loại tiền tệ", "Tỷ giá mua/bán tiền mặt & chuyển khoản", "Chuyển đổi 2 chiều", "So sánh ngân hàng", "Lịch sử tỷ giá", "Cập nhật thường xuyên"],
    faqs: [
      { q: "Tỷ giá cập nhật mấy lần/ngày?", a: "Ngân hàng cập nhật nhiều lần trong ngày; tool đồng bộ gần realtime." },
      { q: "Mua/bán khác nhau sao?", a: "Giá bán (ngân hàng bán cho bạn) luôn cao hơn giá mua (ngân hàng mua từ bạn)." },
      { q: "Tiền mặt vs chuyển khoản?", a: "Chuyển khoản thường có giá tốt hơn tiền mặt do chi phí quản lý thấp hơn." },
    ],
  },
  gold: {
    slug: "/gold",
    title: "Giá Vàng Hôm Nay - SJC, DOJI, PNJ Mới Nhất | FormatBox",
    description:
      "Giá vàng SJC, DOJI, PNJ, 9999 cập nhật realtime. So sánh giá mua/bán giữa các thương hiệu. Biểu đồ biến động.",
    keywords: ["giá vàng hôm nay", "giá vàng sjc", "giá vàng doji", "giá vàng pnj", "giá vàng 9999", "giá vàng miếng"],
    intro:
      "Giá vàng Việt Nam cập nhật từ SJC, DOJI, PNJ, Bảo Tín Minh Châu. Theo dõi giá vàng miếng, vàng nhẫn, vàng trang sức. So sánh giá mua/bán và biên độ chênh lệch.",
    features: ["SJC, DOJI, PNJ, BTMC", "Vàng miếng & nhẫn & nữ trang", "Giá mua/bán realtime", "Biểu đồ biến động", "So sánh thương hiệu", "Miễn phí"],
    faqs: [
      { q: "Giá vàng cập nhật bao lâu?", a: "Các thương hiệu cập nhật nhiều lần/ngày, tool đồng bộ gần realtime." },
      { q: "Vàng SJC khác vàng 9999 thế nào?", a: "SJC là thương hiệu vàng miếng chính thức được NHNN cấp phép; 9999 là độ tinh khiết 99.99%." },
      { q: "Nên mua vàng miếng hay nhẫn?", a: "Vàng miếng dễ bán lại; vàng nhẫn giá rẻ hơn do công thợ thấp." },
    ],
  },
  "lucky-ticket": {
    slug: "/lucky-ticket",
    title: "Dò Vé Số Online - Vietlott, XSMB, XSMN, XSMT | FormatBox",
    description:
      "Dò vé số nhanh miễn phí: Vietlott Power 6/55, Mega 6/45, xổ số miền Bắc, miền Nam, miền Trung. Check nhiều vé cùng lúc.",
    keywords: ["dò vé số", "vietlott", "xổ số miền bắc", "xổ số miền nam", "power 6/55", "mega 6/45", "dò xổ số online"],
    intro:
      "Dò vé số Vietlott (Power 6/55, Mega 6/45) và xổ số truyền thống 3 miền. Nhập dãy số và ngày quay — tool tự đối chiếu với kết quả chính thức.",
    features: ["Vietlott Power & Mega", "Xổ số miền Bắc/Nam/Trung", "Dò nhiều vé cùng lúc", "Lịch sử kết quả", "Hiển thị giải trúng", "Miễn phí"],
    faqs: [
      { q: "Dữ liệu từ đâu?", a: "Từ công bố chính thức của Vietlott và các công ty xổ số kiến thiết." },
      { q: "Có dò vé cũ được không?", a: "Có, tool lưu lịch sử kết quả nhiều kỳ." },
      { q: "Có đảm bảo chính xác không?", a: "Luôn đối chiếu lại với vé gốc và nguồn chính thức để chắc chắn." },
    ],
  },
  wheel: {
    slug: "/wheel",
    title: "Vòng Quay May Mắn Online - Random Picker Miễn Phí | FormatBox",
    description:
      "Vòng quay may mắn online: nhập danh sách, quay chọn ngẫu nhiên công bằng. Hoạt náo, teambuilding, bốc thăm trúng thưởng.",
    keywords: ["vòng quay may mắn", "lucky wheel", "random picker", "quay số may mắn", "bốc thăm online", "random name"],
    intro:
      "Vòng quay may mắn online: nhập danh sách tên/mục, quay vòng chọn ngẫu nhiên. Phù hợp hoạt náo lớp, teambuilding, bốc thăm trúng thưởng, chia nhóm.",
    features: ["Nhập danh sách không giới hạn", "Animation quay mượt", "Loại hoặc giữ sau khi trúng", "Âm thanh quay", "Tùy chỉnh màu từng ô", "Chia sẻ cấu hình"],
    faqs: [
      { q: "Có fair/công bằng không?", a: "Có, tool dùng Math.random() — xác suất mỗi ô đều nhau." },
      { q: "Có giới hạn số mục không?", a: "Không giới hạn, nhưng trên 50 mục sẽ khó đọc chữ." },
      { q: "Lưu danh sách được không?", a: "Có, lưu trong localStorage trình duyệt." },
    ],
  },
  calendar: {
    slug: "/calendar",
    title: "Lịch Vạn Niên - Lịch Âm Dương, Ngày Tốt Xấu | FormatBox",
    description:
      "Lịch vạn niên: xem lịch âm dương, ngày tốt xấu, giờ hoàng đạo, tiết khí. Chuyển đổi âm dương lịch nhanh chóng.",
    keywords: ["lịch vạn niên", "lịch âm", "lịch dương", "ngày tốt xấu", "giờ hoàng đạo", "xem ngày", "âm lịch hôm nay"],
    intro:
      "Lịch vạn niên giúp xem lịch âm dương, ngày tốt xấu, giờ hoàng đạo, tiết khí 24 trong năm. Chuyển đổi 2 chiều giữa dương lịch và âm lịch Việt Nam.",
    features: ["Lịch âm dương chuẩn Việt Nam", "Ngày tốt/xấu, hoàng đạo", "Giờ hoàng đạo", "Tiết khí 24", "Chuyển đổi âm ⇄ dương", "Xem tới 100 năm sau"],
    faqs: [
      { q: "Lịch âm có chính xác với VN không?", a: "Có, tính theo chuẩn múi giờ GMT+7 và lịch Việt Nam." },
      { q: "Ngày hoàng đạo là gì?", a: "Theo truyền thống Á Đông, là ngày tốt để làm việc lớn (cưới, khai trương, động thổ)." },
      { q: "Có hỗ trợ xuất lịch không?", a: "Hiện tại chỉ xem online, chưa export file." },
    ],
  },
  countdown: {
    slug: "/countdown",
    title: "Đồng Hồ Đếm Ngược Online - Countdown Timer | FormatBox",
    description:
      "Đồng hồ đếm ngược online đến sự kiện, ngày sinh nhật, Tết. Hiển thị full màn hình, chia sẻ link countdown.",
    keywords: ["đếm ngược", "countdown", "đồng hồ đếm ngược", "countdown timer", "đếm ngược tết", "đếm ngược sinh nhật"],
    intro:
      "Đếm ngược tới sự kiện bất kỳ: Tết, sinh nhật, deadline, cưới hỏi. Hiển thị full màn hình, lưu nhiều countdown, chia sẻ link.",
    features: ["Nhiều countdown cùng lúc", "Full-screen mode", "Chia sẻ qua link", "Âm thanh khi hết giờ", "Tùy chỉnh màu/background", "Preset: Tết, Năm mới, Noel"],
    faqs: [
      { q: "Đóng tab có mất countdown không?", a: "Không, lưu trong localStorage, mở lại vẫn còn." },
      { q: "Chia sẻ cho người khác được không?", a: "Có, copy link có chứa cấu hình countdown." },
      { q: "Có thông báo khi hết giờ không?", a: "Có âm thanh; thông báo đẩy cần cấp quyền notification." },
    ],
  },
  weather: {
    slug: "/weather",
    title: "Thời Tiết Hôm Nay - Dự Báo 7 Ngày | FormatBox",
    description:
      "Thời tiết hôm nay cho mọi thành phố: nhiệt độ, mưa, gió, độ ẩm. Dự báo chi tiết 7 ngày tới. Miễn phí, không cần đăng ký.",
    keywords: ["thời tiết hôm nay", "dự báo thời tiết", "weather vietnam", "thời tiết hà nội", "thời tiết hcm", "weather forecast"],
    intro:
      "Dự báo thời tiết chi tiết cho mọi thành phố Việt Nam và thế giới: nhiệt độ, lượng mưa, gió, độ ẩm, UV, AQI. Dự báo 7 ngày, cập nhật hàng giờ.",
    features: ["Tìm thành phố nhanh", "Nhiệt độ, mưa, gió, độ ẩm", "Dự báo 7 ngày", "Chỉ số UV & AQI", "Vị trí hiện tại (GPS)", "Nhiều thành phố yêu thích"],
    faqs: [
      { q: "Dữ liệu từ đâu?", a: "Từ các API thời tiết uy tín (OpenWeather hoặc tương đương)." },
      { q: "Có chính xác cho VN không?", a: "Có, hỗ trợ hàng ngàn địa điểm Việt Nam." },
      { q: "Cần cấp quyền vị trí không?", a: "Chỉ khi muốn xem thời tiết vị trí hiện tại, có thể từ chối và nhập tay." },
    ],
  },
  timestamp: {
    slug: "/timestamp",
    title: "Timestamp Converter - Unix Time ⇄ Date | FormatBox",
    description:
      "Chuyển đổi Unix timestamp sang ngày giờ và ngược lại. Hỗ trợ seconds/milliseconds, nhiều timezone, ISO 8601. Dev tool miễn phí.",
    keywords: ["timestamp converter", "unix time", "epoch converter", "chuyển timestamp", "iso 8601", "unix timestamp vietnam"],
    intro:
      "Timestamp Converter chuyển đổi 2 chiều giữa Unix timestamp (seconds/milliseconds) và ngày giờ ở các timezone. Hỗ trợ ISO 8601, RFC 3339, format tùy chỉnh.",
    features: ["Unix ⇄ Date 2 chiều", "Seconds & milliseconds", "Nhiều timezone", "ISO 8601 / RFC 3339", "Giờ hiện tại realtime", "Copy một chạm"],
    faqs: [
      { q: "Seconds vs milliseconds khác gì?", a: "Unix epoch dùng seconds (10 chữ số); JavaScript dùng milliseconds (13 chữ số)." },
      { q: "Timezone nào mặc định?", a: "Timezone trình duyệt của bạn, có thể đổi sang bất kỳ zone nào." },
      { q: "ISO 8601 là gì?", a: "Chuẩn quốc tế: YYYY-MM-DDTHH:MM:SSZ, phổ biến trong API." },
    ],
  },
  "speed-test": {
    slug: "/speed-test",
    title: "Test Tốc Độ Mạng Online - Speed Test Miễn Phí | FormatBox",
    description:
      "Test tốc độ mạng Internet: download, upload, ping, jitter. Nhanh, chính xác, không quảng cáo. Chạy trên trình duyệt.",
    keywords: ["speed test", "test tốc độ mạng", "kiểm tra tốc độ internet", "ping test", "wifi speed", "test mạng"],
    intro:
      "Speed Test đo tốc độ Internet của bạn: download, upload, ping, jitter. Chạy ngay trên trình duyệt, không cần cài app, không quảng cáo xen ngang.",
    features: ["Download & upload speed", "Ping & jitter", "Chọn server test", "Lịch sử các lần test", "Hoạt động trên mobile", "Không quảng cáo"],
    faqs: [
      { q: "Kết quả có chính xác không?", a: "Tương đương với các tool phổ biến như Speedtest.net; sai số nhỏ do điều kiện mạng." },
      { q: "Tại sao tốc độ thấp hơn gói đăng ký?", a: "Phụ thuộc tải mạng, thiết bị, WiFi vs dây, server test, số thiết bị dùng chung." },
      { q: "Nên test khi nào?", a: "Khi mạng cảm thấy chậm, trước khi báo nhà mạng. Test 2–3 lần lấy trung bình." },
    ],
  },
  color: {
    slug: "/color",
    title: "Color Picker & Converter - HEX, RGB, HSL, OKLCH | FormatBox",
    description:
      "Color picker online: chọn màu, chuyển HEX ⇄ RGB ⇄ HSL ⇄ OKLCH. Palette gợi ý, contrast WCAG, gradient generator.",
    keywords: ["color picker", "chuyển mã màu", "hex to rgb", "rgb to hex", "hsl color", "color palette", "màu web"],
    intro:
      "Color Picker & Converter: chọn màu bằng picker trực quan, chuyển đổi giữa HEX, RGB, HSL, OKLCH. Gợi ý palette hài hòa, kiểm tra contrast WCAG, tạo gradient.",
    features: ["Picker trực quan + eyedropper", "HEX ⇄ RGB ⇄ HSL ⇄ OKLCH", "Contrast ratio WCAG AA/AAA", "Palette hài hòa", "Gradient generator", "Lưu màu yêu thích"],
    faqs: [
      { q: "OKLCH là gì?", a: "Color space mới, perceptually uniform — độ sáng/màu nhất quán hơn HSL, hỗ trợ CSS Color 4." },
      { q: "Contrast ratio cần bao nhiêu?", a: "WCAG AA cần ≥4.5:1 cho text thường, 3:1 cho text lớn. AAA ≥7:1." },
      { q: "Eyedropper hoạt động không?", a: "Hỗ trợ trên Chrome/Edge mới (EyeDropper API). Safari/Firefox chưa hỗ trợ." },
    ],
  },
  curl: {
    slug: "/curl",
    title: "cURL Runner Online - Chạy & Convert cURL Command | FormatBox",
    description:
      "Chạy lệnh cURL online, convert sang fetch/axios/Python requests. Test API nhanh không cần cài Postman.",
    keywords: ["curl online", "curl runner", "curl to fetch", "curl to axios", "test api", "curl converter"],
    intro:
      "cURL Runner cho phép paste lệnh cURL và chạy ngay trên trình duyệt, hoặc convert sang code fetch (JS), axios, Python requests, Node http. Test API nhanh gọn.",
    features: ["Chạy cURL trực tiếp", "Convert → fetch / axios / Python", "View response headers & body", "Pretty JSON", "Lưu history", "Hỗ trợ CORS mode"],
    faqs: [
      { q: "Có chạy được mọi API không?", a: "Giới hạn bởi CORS. Nếu API không bật CORS, request từ browser sẽ fail." },
      { q: "Dữ liệu có bị log không?", a: "Không. Request chạy trong browser hoặc proxy ẩn danh, không lưu." },
      { q: "Convert chính xác không?", a: "Hỗ trợ hầu hết flag thông dụng (-H, -d, -X, -F, --data-binary)." },
    ],
  },
  "typing-test": {
    slug: "/typing-test",
    title: "Test Tốc Độ Gõ Phím - Typing Speed Test | FormatBox",
    description:
      "Test tốc độ gõ phím online: WPM, accuracy. Hỗ trợ tiếng Việt và tiếng Anh. Nhiều chế độ: 1 phút, 3 phút, 5 phút.",
    keywords: ["typing test", "test gõ phím", "wpm test", "tốc độ gõ phím", "typing speed", "luyện gõ phím"],
    intro:
      "Typing Test đo tốc độ gõ phím của bạn (WPM — words per minute) và độ chính xác. Hỗ trợ tiếng Việt (có dấu) và tiếng Anh, nhiều mode thời gian.",
    features: ["WPM & accuracy", "Tiếng Việt có dấu", "Mode 1/3/5 phút", "Nhiều chủ đề văn bản", "Lịch sử điểm", "Chạy offline"],
    faqs: [
      { q: "WPM bao nhiêu là nhanh?", a: "40 WPM trung bình, 60+ là nhanh, 80+ là rất nhanh. Chuyên nghiệp 100+." },
      { q: "Có hỗ trợ Telex/VNI không?", a: "Hỗ trợ gõ Unicode trực tiếp, Telex/VNI phụ thuộc bộ gõ hệ thống (Unikey, Laban Key)." },
      { q: "Luyện bao lâu để tăng tốc?", a: "15–30 phút/ngày trong 2–4 tuần có thể tăng 10–20 WPM." },
    ],
  },
  regex: {
    slug: "/regex",
    title: "Regex Tester Online - Regular Expression Debugger | FormatBox",
    description:
      "Test và debug regular expression online: match, replace, giải thích pattern, cheatsheet. Hỗ trợ JavaScript regex đầy đủ flags.",
    keywords: ["regex tester", "regular expression", "regex online", "regex debugger", "regex javascript", "regex cheatsheet"],
    intro:
      "Regex Tester giúp bạn viết, test và debug regular expression ngay trên trình duyệt. Highlight match, hiển thị groups, giải thích pattern bằng tiếng Việt, cheatsheet đầy đủ.",
    features: ["Match & replace realtime", "Highlight match & groups", "Giải thích pattern", "Flags: g, i, m, s, u", "Cheatsheet đi kèm", "Lưu pattern yêu thích"],
    faqs: [
      { q: "Hỗ trợ regex flavor nào?", a: "JavaScript regex (ECMAScript). Khác đôi chút với PCRE (PHP), Python re." },
      { q: "Lookbehind có hoạt động không?", a: "Có trên Chrome/Firefox/Edge mới. Safari cũ có thể không hỗ trợ." },
      { q: "Backtracking catastrophic là gì?", a: "Pattern tệ như `(a+)+b` có thể treo trình duyệt với input dài — tránh nested quantifier." },
    ],
  },
  meme: {
    slug: "/meme",
    title: "Meme Generator Online - Tạo Meme Miễn Phí | FormatBox",
    description:
      "Meme generator online: tạo meme từ template có sẵn hoặc upload ảnh. Thêm text, caption, download PNG. Miễn phí, không watermark.",
    keywords: ["meme generator", "tạo meme", "meme online", "meme template", "chế ảnh meme", "meme miễn phí"],
    intro:
      "Meme Generator cho phép tạo meme nhanh từ template có sẵn hoặc ảnh của bạn. Thêm text trên/dưới hoặc tự do, chọn font Impact chuẩn meme, download PNG không watermark.",
    features: ["100+ template meme phổ biến", "Upload ảnh của bạn", "Text đa vị trí", "Font & màu tùy chỉnh", "Preview realtime", "Download PNG không watermark"],
    faqs: [
      { q: "Có watermark không?", a: "Không, meme download sạch không có logo FormatBox." },
      { q: "Dùng cho mục đích thương mại được không?", a: "Template meme phổ biến thường là public domain; ảnh của bạn thì do bạn sở hữu." },
      { q: "Có hỗ trợ GIF meme không?", a: "Hiện tại chỉ hỗ trợ PNG/JPG, chưa animate GIF." },
    ],
  },
  "travel-plan": {
    slug: "/travel-plan",
    title: "Lộ Trình Du Lịch - Lập Kế Hoạch Chuyến Đi | FormatBox",
    description:
      "Lập lộ trình du lịch chi tiết: điểm đến, thời gian, chi phí, note. Chia sẻ kế hoạch với bạn bè qua link.",
    keywords: ["lộ trình du lịch", "travel plan", "kế hoạch du lịch", "itinerary", "lịch trình chuyến đi"],
    intro:
      "Travel Plan giúp bạn lập lộ trình chuyến đi chi tiết theo ngày: điểm đến, thời gian, chi phí dự kiến, note cá nhân. Chia sẻ với nhóm bạn qua link, không cần đăng ký.",
    features: ["Lộ trình theo ngày", "Dự toán chi phí", "Ghi chú từng điểm", "Chia sẻ qua link", "In ra giấy", "Lưu local"],
    faqs: [
      { q: "Có kết nối Google Maps không?", a: "Mỗi điểm có thể copy ra Maps dễ dàng; chưa tích hợp trực tiếp." },
      { q: "Chia sẻ nhóm sửa chung được không?", a: "Hiện tại chia sẻ dạng xem; chỉnh sửa cộng tác đang phát triển." },
      { q: "Dữ liệu có lưu lâu không?", a: "Lưu trong localStorage trình duyệt — xóa cache sẽ mất." },
    ],
  },
  "license-plate": {
    slug: "/license-plate",
    title: "Tra Biển Số Xe - Biển Số Các Tỉnh Việt Nam | FormatBox",
    description:
      "Tra cứu biển số xe Việt Nam: biển số tỉnh/thành, mã quận huyện, loại xe. Nhận diện biển ngũ quý, biển tam hoa, biển sảnh.",
    keywords: ["tra biển số xe", "biển số xe", "biển số tỉnh", "biển ngũ quý", "biển số đẹp", "mã biển số"],
    intro:
      "Tra cứu biển số xe máy, ô tô Việt Nam: xem thuộc tỉnh/thành nào, loại xe (cá nhân, kinh doanh, nhà nước, quân đội). Phân tích biển đẹp: ngũ quý, tam hoa, sảnh tiến.",
    features: ["63 tỉnh/thành đầy đủ", "Phân biệt loại xe", "Nhận diện biển đẹp", "Lịch sử tra cứu", "Giải thích chữ cái biển", "Miễn phí"],
    faqs: [
      { q: "Biển trắng/vàng/xanh khác gì?", a: "Trắng: cá nhân; vàng: xe kinh doanh; xanh: cơ quan nhà nước; đỏ: quân đội." },
      { q: "Có tra chủ xe được không?", a: "Không. Thông tin chủ xe là dữ liệu riêng tư, chỉ cơ quan chức năng truy cập." },
      { q: "Biển ngũ quý là gì?", a: "5 số giống nhau liên tiếp (ví dụ 11111, 88888) — thuộc nhóm biển siêu đẹp." },
    ],
  },
});

export function toolMetadata(slug: keyof typeof TOOL_SEO): Metadata {
  const s = TOOL_SEO[slug];
  const url = `${SITE_URL}${s.slug}`;
  return {
    title: s.title,
    description: s.description,
    keywords: s.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: s.title,
      description: s.description,
      url,
      siteName: "FormatBox",
      type: "website",
      locale: "vi_VN",
    },
    twitter: {
      card: "summary_large_image",
      title: s.title,
      description: s.description,
    },
  };
}

export function toolJsonLd(slug: keyof typeof TOOL_SEO) {
  const s = TOOL_SEO[slug];
  const url = `${SITE_URL}${s.slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: s.title.split(" | ")[0],
      url,
      description: s.description,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "FormatBox", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: s.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
}
