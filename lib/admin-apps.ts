export type AdminApp = {
  href: string;
  title: string;
  desc: string;
  iconName: string;
};

export const ADMIN_APPS: AdminApp[] = [
  { href: "/admin/blog", title: "Blog", desc: "Sinh bài AI, duyệt/từ chối, chỉnh sửa Markdown.", iconName: "IconArticle" },
  { href: "/admin/menu", title: "Menu", desc: "Quản lý danh sách tools hiển thị ngoài trang chủ.", iconName: "IconListDetails" },
  { href: "/admin/translations", title: "Ngôn ngữ", desc: "Quản lý đa ngôn ngữ thêm, sửa, seed từ source dict.", iconName: "IconLanguage" },
  { href: "/admin/users", title: "Users", desc: "Quản lý tài khoản người dùng trên site.", iconName: "IconUsers" },
  { href: "/admin/analytics", title: "Thống kê", desc: "Lượt sử dụng từng tool theo ngày, top tool hot.", iconName: "IconChartBar" },
  { href: "/admin/theme", title: "Theme", desc: "Chọn theme cho toàn site và bật/tắt.", iconName: "IconPalette" },
  { href: "/admin/banners", title: "Thông báo", desc: "Banner đẩy ra trang chủ — có lịch bật/tắt, cho đóng.", iconName: "IconBroadcast" },
  { href: "/admin/feedback", title: "Liên hệ góp ý", desc: "Góp ý từ Google Sheet + file đính kèm Drive.", iconName: "IconMessageDots" },
  { href: "/admin/podcasts", title: "Podcasts", desc: "MachuTeam podcast — tập podcast + video YouTube.", iconName: "IconMicrophone" },
  { href: "/admin/photobooth", title: "Photobooth", desc: "Ảnh chụp lưu trên Vercel Blob — tự xoá sau 24h.", iconName: "IconCamera" },
  { href: "/admin/gameplay", title: "Gameplay", desc: "Chọn game để chơi — Pac-Man, Flappy Bird.", iconName: "IconDeviceGamepad2" },
  { href: "/admin/ui", title: "UI Kit", desc: "Bộ component dùng chung — Button, Input, Modal…", iconName: "IconComponents" },
];

export const ADMIN_APP_HREFS = new Set(ADMIN_APPS.map((a) => a.href));

// Pages that admin role always keeps regardless of visibility settings
// (dashboard root + the menu page itself, since superadmin uses /admin/menu).
export const ADMIN_APP_ALWAYS_ON = new Set<string>(["/admin"]);
