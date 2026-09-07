"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "vi" | "en";

type Dict = Record<string, { vi: string; en: string }>;

const dict = {
  // NAV / MENU
  nav_tools: { vi: "Công cụ", en: "Tools" },
  nav_search_placeholder: { vi: "Tìm công cụ", en: "Search tools" },
  nav_all_tools: { vi: "Tất cả tool", en: "All tools" },
  nav_results: { vi: "kết quả", en: "results" },
  nav_no_result: { vi: "Không tìm thấy công cụ nào cho", en: "No tools found for" },
  cat_text: { vi: "Văn bản & Dữ liệu", en: "Text & Data" },
  cat_media: { vi: "Hình ảnh & File", en: "Media & Files" },
  cat_dev: { vi: "Công cụ Dev", en: "Dev Tools" },
  cat_life: { vi: "Tiện ích", en: "Utilities" },

  // HERO
  hero_tag: { vi: "100% client-side", en: "100% client-side" },
  hero_h1_1: { vi: "Chuyển đổi dữ liệu", en: "Convert your data" },
  hero_h1_2: { vi: "ngay trên trình duyệt.", en: "right in your browser." },
  hero_sub: {
    vi: "Base64, JSON, hình ảnh — paste vào, nhận kết quả tức thì. Dữ liệu không bao giờ rời khỏi máy bạn.",
    en: "Base64, JSON, images — paste in, get results instantly. Your data never leaves your device.",
  },

  // STATS
  stat_ads: { vi: "quảng cáo", en: "ads" },
  stat_tools: { vi: "công cụ", en: "tools" },
  stat_client: { vi: "client-side", en: "client-side" },
  stat_uses: { vi: "lần dùng", en: "uses" },

  // SECTIONS
  sec_tools_h: { vi: "Công cụ nổi bật", en: "Featured tools" },
  sec_tools_d: {
    vi: "Không cần cài đặt, không cần đăng ký. Mở tab, làm việc, đóng tab.",
    en: "No install, no signup. Open a tab, get work done, close it.",
  },
  sec_why_h_1: { vi: "Tool khác upload dữ liệu.", en: "Other tools upload your data." },
  sec_why_h_2: { vi: "FormatBox thì không.", en: "FormatBox doesn't." },
  sec_coming_h: { vi: "Sắp có thêm", en: "Coming soon" },

  // WHY
  why_01_h: { vi: "Chạy trên trình duyệt", en: "Runs in your browser" },
  why_01_p: {
    vi: "Không server nào nhận dữ liệu. Tắt mạng vẫn dùng được.",
    en: "No server touches your data. Works offline once loaded.",
  },
  why_02_h: { vi: "Tức thì, không giới hạn", en: "Instant, no limits" },
  why_02_p: {
    vi: "Không hàng đợi, không quota. File 50MB hay 5KB đều như nhau.",
    en: "No queue, no quota. 50MB or 5KB — same experience.",
  },
  why_03_h: { vi: "Không tracking", en: "No tracking" },
  why_03_p: {
    vi: "Không popup, không banner, không cookie theo dõi.",
    en: "No popups, no banners, no tracking cookies.",
  },
  why_04_h: { vi: "Mọi thiết bị", en: "Every device" },
  why_04_p: {
    vi: "Desktop, mobile, tablet. Bookmark, dùng khi cần.",
    en: "Desktop, mobile, tablet. Bookmark and use anytime.",
  },

  // CTA
  cta_h: { vi: "Bắt đầu ngay, không cần đăng ký.", en: "Get started — no signup needed." },
  cta_p: {
    vi: "Chọn một tool ở trên hoặc bắt đầu với Base64.",
    en: "Pick a tool above or start with Base64.",
  },
  cta_btn: { vi: "Mở Base64 tool", en: "Open Base64 tool" },

  // FOOTER
  ft_desc: {
    vi: "Bộ công cụ chuyển đổi dữ liệu chạy hoàn toàn trên trình duyệt. Không đăng ký, không quảng cáo.",
    en: "Client-side data-conversion utilities. No signup, no ads.",
  },
  ft_tools: { vi: "CÔNG CỤ", en: "TOOLS" },
  ft_author: { vi: "TÁC GIẢ", en: "AUTHOR" },
  ft_copy: {
    vi: "© 2026 FormatBox. Made in Ho Chi Minh City.",
    en: "© 2026 FormatBox. Made in Ho Chi Minh City.",
  },
  ft_stack: { vi: "v1.0 · Next.js", en: "v1.0 · Next.js" },

  // COMMON ACTIONS
  act_copy: { vi: "Copy", en: "Copy" },
  act_download: { vi: "Tải file", en: "Download" },
  act_download_img: { vi: "Tải ảnh PNG", en: "Download PNG" },
  act_clear: { vi: "Xoá", en: "Clear" },
  act_sample: { vi: "Mẫu", en: "Sample" },
  act_from_file: { vi: "Từ file", en: "From file" },
  act_open_file: { vi: "Mở file", en: "Open file" },
  act_choose_file: { vi: "chọn file", en: "choose file" },
  act_export: { vi: "Export", en: "Export" },
  act_format: { vi: "Format", en: "Format" },
  act_minify: { vi: "Minify", en: "Minify" },
  act_validate: { vi: "Validate", en: "Validate" },
  act_convert: { vi: "Chuyển đổi", en: "Convert" },
  act_reset_img: { vi: "Chọn ảnh khác", en: "Pick another image" },
  act_redraw: { vi: "Vẽ lại", en: "Redraw" },
  act_fit_view: { vi: "Fit view", en: "Fit view" },
  act_saving: { vi: "Đang xuất...", en: "Exporting..." },

  // COMMON TOASTS
  toast_no_data: { vi: "Chưa có dữ liệu", en: "No input" },
  toast_copied: { vi: "Đã copy", en: "Copied" },
  toast_only_images: { vi: "Chỉ hỗ trợ file ảnh", en: "Images only" },
  toast_only_markdown: { vi: "Chỉ hỗ trợ file text/markdown", en: "Text/Markdown only" },
  toast_download_ok: { vi: "Đã tải", en: "Downloaded" },
  toast_invalid_data: { vi: "Lỗi: dữ liệu không hợp lệ", en: "Error: invalid data" },
  toast_html_copied: { vi: "Đã copy HTML", en: "HTML copied" },
  toast_html_downloaded: { vi: "Đã tải HTML", en: "HTML downloaded" },
  toast_graph_saved: { vi: "Đã tải graph.json", en: "Saved graph.json" },
  toast_valid_json: { vi: "JSON hợp lệ", en: "Valid JSON" },
  toast_sample_loaded: { vi: "Đã điền dữ liệu mẫu", en: "Sample data loaded" },

  // COMMON LABELS
  lbl_chars: { vi: "chars", en: "chars" },
  lbl_words: { vi: "words", en: "words" },
  lbl_lines: { vi: "lines", en: "lines" },
  lbl_result: { vi: "Kết quả", en: "Result" },

  // BASE64
  b64_title: { vi: "Encode / Decode", en: "Encode / Decode" },
  b64_sub: {
    vi: "Mã hóa hoặc giải mã Base64. Hỗ trợ text UTF-8 và file. Xử lý ngay trên trình duyệt.",
    en: "Encode or decode Base64. UTF-8 text + files, right in your browser.",
  },
  b64_label_enc: { vi: "Nhập text cần encode", en: "Enter text to encode" },
  b64_label_dec: { vi: "Nhập Base64 cần decode", en: "Enter Base64 to decode" },
  b64_placeholder_text: { vi: "Paste text vào đây...", en: "Paste text here..." },
  b64_placeholder_b64: { vi: "Paste Base64 vào đây...", en: "Paste Base64 here..." },
  b64_drop: { vi: "Kéo thả file vào đây hoặc", en: "Drop a file here or" },
  b64_result_hint: { vi: "Kết quả sẽ hiện ở đây...", en: "Result appears here..." },
  b64_swap: { vi: "Đổi chiều", en: "Swap direction" },

  // JSON
  json_title: { vi: "Formatter & Validator", en: "Formatter & Validator" },
  json_sub: {
    vi: "Format, validate, minify JSON. Highlight lỗi, tree view, tính kích thước.",
    en: "Format, validate, minify JSON. Error highlighting, tree view, size info.",
  },
  json_label: { vi: "Input JSON", en: "Input JSON" },
  json_idle: { vi: "Paste JSON để bắt đầu", en: "Paste JSON to start" },
  json_valid: { vi: "JSON hợp lệ", en: "Valid JSON" },
  json_invalid: { vi: "JSON không hợp lệ", en: "Invalid JSON" },
  json_formatted: { vi: "Đã format", en: "Formatted" },
  json_minified_prefix: { vi: "Đã minify (giảm", en: "Minified (saved" },
  json_indent: { vi: "Indent:", en: "Indent:" },
  json_spaces: { vi: "spaces", en: "spaces" },
  json_tab: { vi: "Tab", en: "Tab" },
  json_tree_view: { vi: "Tree view", en: "Tree view" },
  json_type_array: { vi: "Array", en: "Array" },
  json_type_object: { vi: "Object", en: "Object" },
  json_keys: { vi: "keys", en: "keys" },
  json_depth: { vi: "depth", en: "depth" },
  json_empty: {
    vi: "Bấm Format để xem tree view và thông tin cấu trúc.",
    en: "Click Format to see tree view and structure info.",
  },

  // GRAPH
  graph_title: { vi: "Graph Visualizer", en: "Graph Visualizer" },
  graph_sub: {
    vi: "Chuyển JSON thành đồ thị tương tác. Pan, zoom, khám phá cấu trúc dữ liệu.",
    en: "Turn JSON into an interactive graph. Pan, zoom, explore structure.",
  },
  graph_input: { vi: "Input JSON", en: "Input JSON" },
  graph_paste: { vi: "Paste JSON để bắt đầu", en: "Paste JSON to start" },
  graph_nodes: { vi: "nodes", en: "nodes" },
  graph_edges: { vi: "edges", en: "edges" },
  graph_lg_object: { vi: "object", en: "object" },
  graph_lg_array: { vi: "array", en: "array" },
  graph_lg_value: { vi: "value", en: "value" },

  // IMAGE
  img_title: { vi: "Converter", en: "Converter" },
  img_sub: {
    vi: "Chuyển đổi giữa PNG, JPG, WebP. Kéo thả ảnh, chỉnh chất lượng, tải về.",
    en: "Convert between PNG, JPG, WebP. Drop image, tune quality, save.",
  },
  img_drop: { vi: "Kéo thả ảnh vào đây hoặc", en: "Drop an image here or" },
  img_convert_to: { vi: "Chuyển sang", en: "Convert to" },
  img_quality: { vi: "Chất lượng", en: "Quality" },
  img_quality_only: { vi: "(chỉ JPG/WebP)", en: "(JPG/WebP only)" },
  img_original: { vi: "Original", en: "Original" },
  img_converted: { vi: "Converted", en: "Converted" },
  img_save: { vi: "Tải ảnh", en: "Download image" },
  img_smaller: { vi: "nhỏ hơn", en: "smaller" },
  img_bigger: { vi: "lớn hơn", en: "bigger" },

  // JWT
  jwt_title: { vi: "Decoder", en: "Decoder" },
  jwt_sub: {
    vi: "Paste token → giải mã header + payload + claims. Không verify signature.",
    en: "Paste token → decode header + payload + claims. No signature verify.",
  },
  jwt_label: { vi: "JWT Token", en: "JWT Token" },
  jwt_placeholder: {
    vi: "Paste JWT (header.payload.signature)",
    en: "Paste JWT (header.payload.signature)",
  },
  jwt_valid_shape: { vi: "Cấu trúc hợp lệ", en: "Valid structure" },
  jwt_expired_at: { vi: "Hết hạn:", en: "Expired:" },
  jwt_expires_at: { vi: "Hết hạn lúc:", en: "Expires at:" },
  jwt_not_yet: { vi: "Chưa có hiệu lực", en: "Not yet valid" },
  jwt_expired_badge: { vi: "HẾT HẠN", en: "EXPIRED" },
  jwt_sig_note: {
    vi: "Signature không được verify (cần key). Đây là base64url raw.",
    en: "Signature is not verified (needs a key). This is raw base64url.",
  },
  jwt_empty: {
    vi: "Paste JWT vào ô bên trái để giải mã.",
    en: "Paste a JWT on the left to decode.",
  },

  // MARKDOWN
  md_title: { vi: "Reader", en: "Reader" },
  md_sub: {
    vi: "Paste, kéo thả .md, xem preview trực tiếp. Copy HTML hoặc tải file HTML về.",
    en: "Paste or drop .md, live preview. Copy HTML or download as file.",
  },
  md_mode_edit: { vi: "Edit", en: "Edit" },
  md_mode_split: { vi: "Split", en: "Split" },
  md_mode_preview: { vi: "Preview", en: "Preview" },
  md_editor: { vi: "Markdown", en: "Markdown" },
  md_preview: { vi: "Preview", en: "Preview" },
  md_placeholder: {
    vi: "Paste hoặc kéo thả file .md vào đây...",
    en: "Paste or drop a .md file here...",
  },
  md_reading: { vi: "phút đọc", en: "min read" },
  md_copy_html: { vi: "Copy HTML", en: "Copy HTML" },
  md_download_html: { vi: "Tải HTML", en: "Download HTML" },

  // TEXT CASE
  tc_title: { vi: "Case Converter", en: "Case Converter" },
  tc_sub: {
    vi: "Paste text, xem mọi cách viết. Click vào card để copy.",
    en: "Paste text, see every case. Click a card to copy.",
  },
  tc_input_label: { vi: "Nhập text", en: "Enter text" },
  tc_input_placeholder: { vi: "Paste text vào đây...", en: "Paste text here..." },
  tc_reset_lower: { vi: "Về gốc lower", en: "Reset to lowercase" },
  tc_click_copy: { vi: "Click để copy", en: "Click to copy" },

  // RESPONSIVE TESTER
  rt_title: { vi: "Tester", en: "Tester" },
  rt_sub: {
    vi: "Xem trang web ở nhiều kích thước thiết bị. Xoay ngang, chỉnh zoom, so sánh nhanh.",
    en: "View any website across many device sizes. Rotate, zoom, compare quickly.",
  },
  rt_url_label: { vi: "URL trang web", en: "Website URL" },
  rt_url_ph: { vi: "https://example.com", en: "https://example.com" },
  rt_go: { vi: "Xem", en: "Go" },
  rt_reload: { vi: "Tải lại", en: "Reload" },
  rt_rotate: { vi: "Xoay", en: "Rotate" },
  rt_open_new: { vi: "Mở tab mới", en: "Open in tab" },
  rt_zoom: { vi: "Zoom", en: "Zoom" },
  rt_fit: { vi: "Vừa khung", en: "Fit" },
  rt_category_mobile: { vi: "Điện thoại", en: "Mobile" },
  rt_category_tablet: { vi: "Máy tính bảng", en: "Tablet" },
  rt_category_desktop: { vi: "Máy tính", en: "Desktop" },
  rt_empty: {
    vi: "Dán URL vào ô bên trái để bắt đầu.",
    en: "Paste a URL on the left to start.",
  },
  rt_iframe_warn: {
    vi: "Một số site chặn nhúng iframe (X-Frame-Options / CSP). Nếu trang trắng, mở tab mới thay thế.",
    en: "Some sites block iframe embedding (X-Frame-Options / CSP). If it stays blank, open in a new tab.",
  },
  rt_invalid_url: { vi: "URL không hợp lệ", en: "Invalid URL" },

  // WHEEL
  wh_title: { vi: "Wheel", en: "Wheel" },
  wh_sub: {
    vi: "Vòng quay may mắn. Nhập danh sách mỗi dòng một mục, bấm quay để chọn ngẫu nhiên.",
    en: "Lucky wheel. Enter one item per line and spin to pick at random.",
  },
  wh_items_label: { vi: "Danh sách (mỗi dòng một mục)", en: "Items (one per line)" },
  wh_items_placeholder: { vi: "Táo\nCam\nChuối\nDưa hấu", en: "Apple\nOrange\nBanana\nWatermelon" },
  wh_spin: { vi: "Quay!", en: "Spin!" },
  wh_spinning: { vi: "Đang quay...", en: "Spinning..." },
  wh_winner: { vi: "🎉 Kết quả:", en: "🎉 Winner:" },
  wh_remove_winner: { vi: "Loại người thắng", en: "Remove winner" },
  wh_shuffle: { vi: "Xáo trộn", en: "Shuffle" },
  wh_reset: { vi: "Reset", en: "Reset" },
  wh_history: { vi: "Lịch sử", en: "History" },
  wh_history_empty: { vi: "Chưa có lượt quay nào.", en: "No spins yet." },
  wh_clear_history: { vi: "Xoá lịch sử", en: "Clear history" },
  wh_count: { vi: "mục", en: "items" },
  wh_need_items: { vi: "Cần ít nhất 2 mục để quay", en: "Need at least 2 items to spin" },
  wh_empty_wheel: {
    vi: "Nhập ít nhất 2 mục bên trái để bắt đầu.",
    en: "Enter at least 2 items on the left to start.",
  },
  wh_preset_label: { vi: "Chủ đề", en: "Preset" },
  wh_preset_custom: { vi: "Tuỳ chỉnh", en: "Custom" },
  wh_preset_food: { vi: "Món ăn", en: "Food" },
  wh_preset_drink: { vi: "Nước uống", en: "Drinks" },
  wh_preset_person: { vi: "May mắn / Thua cuộc", en: "Lucky / Loser" },
  wh_saved_hint: { vi: "Danh sách tự lưu vào trình duyệt.", en: "List saved to your browser." },
  wh_winner_title: { vi: "Chúc mừng!", en: "Congratulations!" },
  wh_winner_close: { vi: "Đóng", en: "Close" },
  wh_spin_again: { vi: "Quay lại", en: "Spin again" },

  // CURL RUNNER
  cu_title: { vi: "Runner", en: "Runner" },
  cu_sub: {
    vi: "Dán câu lệnh cURL, xem parse và response giống Postman. Chạy trực tiếp trên trình duyệt.",
    en: "Paste a cURL command, inspect parsed request and response Postman-style. Runs in your browser.",
  },
  cu_input_label: { vi: "cURL command", en: "cURL command" },
  cu_placeholder: {
    vi: "curl -X GET 'https://api.github.com/users/vercel' -H 'Accept: application/json'",
    en: "curl -X GET 'https://api.github.com/users/vercel' -H 'Accept: application/json'",
  },
  cu_send: { vi: "Gửi", en: "Send" },
  cu_sending: { vi: "Đang gửi...", en: "Sending..." },
  cu_parse_err: { vi: "Không parse được cURL", en: "Cannot parse cURL" },
  cu_request: { vi: "Request", en: "Request" },
  cu_response: { vi: "Response", en: "Response" },
  cu_tab_body: { vi: "Body", en: "Body" },
  cu_tab_headers: { vi: "Headers", en: "Headers" },
  cu_tab_raw: { vi: "Raw", en: "Raw" },
  cu_status: { vi: "Trạng thái", en: "Status" },
  cu_time: { vi: "Thời gian", en: "Time" },
  cu_size: { vi: "Kích thước", en: "Size" },
  cu_cors_warn: {
    vi: "Trình duyệt sẽ chặn nếu API không bật CORS. Nếu lỗi 'Failed to fetch' → dùng server hoặc API có CORS.",
    en: "Browser will block if the API doesn't allow CORS. If you see 'Failed to fetch', try a CORS-enabled API.",
  },
  cu_no_body: { vi: "(response rỗng)", en: "(empty response)" },
  cu_empty: {
    vi: "Dán câu lệnh cURL bên trái và bấm Gửi để xem response.",
    en: "Paste a cURL command on the left and hit Send to inspect the response.",
  },

  // COUNTDOWN
  cd_title: { vi: "Timer", en: "Timer" },
  cd_sub: {
    vi: "Đếm ngược tới sự kiện quan trọng. Lưu nhiều mốc, chạy trực tiếp trên trình duyệt.",
    en: "Count down to any event. Save multiple targets, runs right in your browser.",
  },
  cd_new: { vi: "Thêm mới", en: "New countdown" },
  cd_title_ph: { vi: "Tên sự kiện (VD: Sinh nhật)", en: "Event title (e.g. Birthday)" },
  cd_add: { vi: "Thêm", en: "Add" },
  cd_presets: { vi: "Mẫu nhanh", en: "Quick presets" },
  cd_preset_ny: { vi: "Năm mới", en: "New Year" },
  cd_preset_xmas: { vi: "Giáng sinh", en: "Christmas" },
  cd_preset_birthday: { vi: "Sinh nhật (30 ngày nữa)", en: "Birthday (in 30 days)" },
  cd_list: { vi: "Danh sách", en: "Your list" },
  cd_count: { vi: "mốc", en: "events" },
  cd_list_empty: { vi: "Chưa có mốc nào.", en: "No countdowns yet." },
  cd_saved_hint: { vi: "Danh sách tự lưu vào trình duyệt.", en: "Saved to your browser." },
  cd_empty: {
    vi: "Thêm một mốc bên trái để bắt đầu.",
    en: "Add a countdown on the left to start.",
  },
  cd_target: { vi: "Mốc thời gian", en: "Target" },
  cd_arrived: { vi: "🎉 Đã tới lúc!", en: "🎉 Time's up!" },
  cd_done: { vi: "xong", en: "done" },
  cd_short_d: { vi: "n", en: "d" },
  cd_unit_d: { vi: "Ngày", en: "Days" },
  cd_unit_h: { vi: "Giờ", en: "Hours" },
  cd_unit_m: { vi: "Phút", en: "Minutes" },
  cd_unit_s: { vi: "Giây", en: "Seconds" },
  cd_need_title: { vi: "Cần nhập tên sự kiện", en: "Need an event title" },
  cd_need_date: { vi: "Cần chọn thời gian", en: "Pick a target date/time" },
  cd_need_future: { vi: "Thời gian phải ở tương lai", en: "Target must be in the future" },

  // FUEL PRICE
  fp_title: { vi: "Price", en: "Price" },
  fp_sub: {
    vi: "Giá xăng dầu Việt Nam kỳ điều hành gần nhất. Nguồn tự động từ VnExpress, cập nhật mỗi giờ.",
    en: "Vietnam fuel prices — latest adjustment cycle. Auto-sourced from VnExpress, refreshed hourly.",
  },
  fp_refresh: { vi: "Làm mới", en: "Refresh" },
  fp_source: { vi: "Nguồn", en: "Source" },
  fp_published: { vi: "Bài đăng", en: "Published" },
  fp_fetched: { vi: "Đồng bộ lúc", en: "Fetched" },
  fp_mode_live: { vi: "Live", en: "Live" },
  fp_mode_fallback: { vi: "Dự phòng", en: "Fallback" },
  fp_stale_title: { vi: "Dữ liệu dự phòng", en: "Fallback data" },
  fp_stale_msg: {
    vi: "Không lấy được dữ liệu live — hiển thị số cuối cùng đã lưu.",
    en: "Live fetch failed — showing last cached values.",
  },
  fp_err_title: { vi: "Lỗi tải dữ liệu", en: "Load error" },
  fp_chart_history_title: { vi: "Lịch sử giá theo tháng", en: "Price history by month" },
  fp_chart_history_aria: { vi: "Lịch sử giá xăng dầu theo tháng", en: "Fuel price history by month" },
  fp_chart_empty_msg: {
    vi: "Tất cả loại đã ẩn. Bấm reset để hiện lại tất cả.",
    en: "All series hidden. Click reset to show all.",
  },
  fp_chart_reset: { vi: "Reset chart", en: "Reset chart" },
  fp_chart_reset_short: { vi: "Reset", en: "Reset" },
  fp_kind_e10: { vi: "E10 RON 95", en: "E10 RON 95" },
  fp_kind_e5: { vi: "E5 RON 92", en: "E5 RON 92" },
  fp_kind_diesel: { vi: "Diesel", en: "Diesel" },
  fp_kind_kerosene: { vi: "Dầu hoả", en: "Kerosene" },
  fp_kind_mazut: { vi: "Mazut", en: "Mazut" },
  fp_latest: { vi: "Kỳ mới nhất", en: "Latest cycle" },
  fp_click_hint: { vi: "Click 1 điểm trên chart để xem chi tiết", en: "Click a point on the chart for details" },
  fp_source_link: { vi: "Bài gốc", en: "Article" },

  // GOLD PRICE
  gp_title: { vi: "Price", en: "Price" },
  gp_sub: {
    vi: "Giá vàng Việt Nam realtime — SJC, PNJ, 24K, 18K… lấy trực tiếp từ feed PNJ live.",
    en: "Live Vietnam gold prices — SJC, PNJ, 24K, 18K, and more, straight from PNJ's live feed.",
  },
  gp_refresh: { vi: "Làm mới", en: "Refresh" },
  gp_source: { vi: "Nguồn", en: "Source" },
  gp_published: { vi: "Cập nhật", en: "Updated" },
  gp_fetched: { vi: "Đồng bộ lúc", en: "Fetched" },
  gp_mode_live: { vi: "Live", en: "Live" },
  gp_mode_fallback: { vi: "Dự phòng", en: "Fallback" },
  gp_stale_title: { vi: "Dữ liệu dự phòng", en: "Fallback data" },
  gp_stale_msg: {
    vi: "Không lấy được dữ liệu live — hiển thị số cuối cùng đã lưu.",
    en: "Live fetch failed — showing last cached values.",
  },
  gp_err_title: { vi: "Lỗi tải dữ liệu", en: "Load error" },
  gp_buy: { vi: "Mua vào", en: "Buy" },
  gp_sell: { vi: "Bán ra", en: "Sell" },
  gp_spread: { vi: "Chênh lệch", en: "Spread" },
  gp_branch_all: { vi: "Tất cả chi nhánh", en: "All branches" },
  gp_branch: { vi: "Chi nhánh", en: "Branch" },
  gp_empty_title: { vi: "Không có dữ liệu", en: "No data" },
  gp_empty_msg: {
    vi: "Không có mục nào khớp với bộ lọc hiện tại.",
    en: "No item matches the current filter.",
  },

  // LUCKY TICKET (dò vé số)
  lt_title: { vi: "Dò vé số", en: "Lottery Checker" },
  lt_sub: {
    vi: "Dò vé số 3 miền — kết quả realtime từ minhngoc.net.vn. Nhập số, xem ngay trúng giải nào.",
    en: "Check Vietnamese lottery tickets across 3 regions with live results from minhngoc.net.vn.",
  },
  lt_refresh: { vi: "Làm mới", en: "Refresh" },
  lt_source: { vi: "Nguồn", en: "Source" },
  lt_published: { vi: "Cập nhật", en: "Updated" },
  lt_fetched: { vi: "Đồng bộ lúc", en: "Fetched" },
  lt_mode_live: { vi: "Live", en: "Live" },
  lt_mode_fallback: { vi: "Dự phòng", en: "Fallback" },
  lt_stale_title: { vi: "Dữ liệu dự phòng", en: "Fallback data" },
  lt_stale_msg: {
    vi: "Không lấy được kết quả live — hiển thị dữ liệu mẫu.",
    en: "Live fetch failed — showing sample data.",
  },
  lt_err_title: { vi: "Lỗi tải dữ liệu", en: "Load error" },
  lt_empty_title: { vi: "Không có kết quả", en: "No results" },
  lt_empty_msg: {
    vi: "Chưa có kết quả cho miền này.",
    en: "No results for this region yet.",
  },
  lt_check_title: { vi: "Dò số vé", en: "Check your ticket" },
  lt_check_ph: { vi: "Nhập số vé (2–6 chữ số cuối)", en: "Enter your ticket (last 2–6 digits)" },
  lt_check_hint: {
    vi: "Gõ số vé của bạn để tự động highlight và xem có trúng giải nào.",
    en: "Type your ticket number to auto-highlight matching prizes.",
  },

  // BILL
  bill_title: { vi: "Splitter", en: "Splitter" },
  bill_sub: {
    vi: "Điền chi phí nhóm, xem preview và tải ảnh PNG hoặc copy vào clipboard.",
    en: "Fill in group expenses, preview, and download PNG or copy to clipboard.",
  },
} as const;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: keyof typeof dict) => string };
const I18nCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fb-lang") as Lang | null;
      if (saved === "vi" || saved === "en") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("fb-lang", l);
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key) => (dict as Dict)[key]?.[lang] ?? String(key),
    }),
    [lang, setLang],
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const v = useContext(I18nCtx);
  if (!v) throw new Error("useI18n outside provider");
  return v;
}
