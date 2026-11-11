// Web Push: gửi notification tới các trình duyệt đã subscribe, kể cả khi tab
// admin đã đóng / máy khoá màn hình. Subscription lưu ở Supabase
// (`push_subscriptions`); endpoint hết hạn (404/410) sẽ bị xoá tự động.
//
// iOS/iPadOS (Safari 16.4+) chỉ nhận Web Push khi trang được "Thêm vào MH
// chính" và mở từ icon đó — subscription tạo trong tab Safari thường không có.
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  // Apple (web.push.apple.com) từ chối JWT với BadJwtToken nếu subject không
  // phải mailto:/https: hợp lệ — trim để tránh khoảng trắng lọt từ env.
  const subject = (process.env.VAPID_SUBJECT || "mailto:admin@formatbox.site").trim();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey.trim(), privateKey.trim());
  configured = true;
  return true;
}

export function hasPushConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

export type AdminPushPayload =
  | { type: "blog-new-post"; slug: string; title: string; done?: boolean }
  | { type: "blog-auto-stopped"; reason: string }
  | { type: "blog-push-test"; title: string };

export type PushSendResult = { sent: number; failed: number; errors: string[] };

// Giữ 1 ngày: điện thoại tắt màn hình / mất mạng vẫn nhận được khi online lại.
// urgency "high" để APNs/FCM đẩy ngay thay vì gom lại khi máy đang ngủ.
const SEND_OPTIONS = { TTL: 60 * 60 * 24, urgency: "high" as const };

async function sendToRows(rows: SubRow[], payload: AdminPushPayload): Promise<PushSendResult> {
  const body = JSON.stringify(payload);
  const stale: string[] = [];
  const result: PushSendResult = { sent: 0, failed: 0, errors: [] };
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
          SEND_OPTIONS,
        );
        result.sent++;
      } catch (e: any) {
        result.failed++;
        const status = Number(e?.statusCode);
        if (status === 404 || status === 410) stale.push(row.id);
        const host = (() => {
          try {
            return new URL(row.endpoint).host;
          } catch {
            return "?";
          }
        })();
        const msg = `${host}: ${status || ""} ${String(e?.body || e?.message || e).slice(0, 200)}`.trim();
        result.errors.push(msg);
        console.error("[push] send failed", msg);
      }
    }),
  );
  if (stale.length) {
    await supabaseAdmin().from("push_subscriptions").delete().in("id", stale);
  }
  return result;
}

export async function sendAdminPush(payload: AdminPushPayload): Promise<PushSendResult> {
  const empty: PushSendResult = { sent: 0, failed: 0, errors: [] };
  if (!ensureConfigured()) return { ...empty, errors: ["VAPID chưa cấu hình trên server"] };
  const { data, error } = await supabaseAdmin().from("push_subscriptions").select("id,endpoint,p256dh,auth");
  if (error) return { ...empty, errors: [error.message] };
  if (!data || data.length === 0) return empty;
  return sendToRows(data as SubRow[], payload);
}

// Gửi tới đúng 1 endpoint (nút "Gửi thử" trên thiết bị đang mở).
export async function sendPushToEndpoint(endpoint: string, payload: AdminPushPayload): Promise<PushSendResult> {
  const empty: PushSendResult = { sent: 0, failed: 0, errors: [] };
  if (!ensureConfigured()) return { ...empty, errors: ["VAPID chưa cấu hình trên server"] };
  const { data, error } = await supabaseAdmin()
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("endpoint", endpoint)
    .limit(1);
  if (error) return { ...empty, errors: [error.message] };
  if (!data || data.length === 0) return { ...empty, errors: ["Thiết bị này chưa đăng ký trên server"] };
  return sendToRows(data as SubRow[], payload);
}

export async function sendBlogNewPostPush(post: { slug: string; title: string }, done = false) {
  return sendAdminPush({ type: "blog-new-post", slug: post.slug, title: post.title, done });
}
