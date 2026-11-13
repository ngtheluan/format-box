"use client";
import { REVIEW_EVENT, takePendingReview } from "@/lib/admin-push-client";
import { useEffect } from "react";

// Lưới an toàn cho thông báo "Bài viết mới chờ duyệt": trên PWA iOS, chạm vào
// thông báo đôi khi chỉ mở app ở trang bắt đầu (/admin) thay vì link của bài.
// Mỗi lần app hiện lên, component này hỏi service worker xem có bài nào vừa
// được chạm không; có thì đưa admin tới hộp Duyệt / Từ chối của đúng bài đó.
export default function PushReviewBridge() {
  useEffect(() => {
    let timers: number[] = [];
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const slug = await takePendingReview();
      if (!slug) return;
      if (window.location.pathname.startsWith("/admin/blog")) {
        window.dispatchEvent(new CustomEvent(REVIEW_EVENT, { detail: { slug } }));
      } else {
        window.location.assign(`/admin/blog?review=${encodeURIComponent(slug)}`);
      }
    };
    // Service worker có thể ghi slug sau khi app đã hiện lên — thử lại vài nhịp.
    const schedule = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [0, 700, 2000].map((ms) => window.setTimeout(() => void check(), ms));
    };
    // Service worker đã tự gửi slug tới trang → bỏ bản ghi chờ để lần hiện sau
    // không mở lại hộp duyệt của bài đã xử lý.
    const onSwMessage = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === "blog-open-review") void takePendingReview();
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("pageshow", schedule);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("pageshow", schedule);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, []);
  return null;
}
