// Web Push: gửi notification tới các trình duyệt đã subscribe, kể cả khi tab
// admin đã đóng / máy khoá màn hình. Subscription lưu ở Supabase
// (`push_subscriptions`); endpoint hết hạn (404/410) sẽ bị xoá tự động.
//
// iOS/iPadOS (Safari 16.4+) chỉ nhận Web Push khi trang được "Thêm vào MH
// chính" và mở từ icon đó — subscription tạo trong tab Safari thường không có.
// web-push 4.x là ESM thuần, chỉ có named exports — `import webpush from ...`
// sẽ trả undefined và ném "Cannot read properties of undefined (setVapidDetails)".
import * as webpush from "web-push";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

let configured = false;
let configError: string | null = null;

// Suy ra public key (65-byte uncompressed P-256) từ private key và so với
// public key env. Apple trả 403 BadJwtToken nếu signature JWT không verify
// được bằng applicationServerKey subscription đã dùng — nghĩa là server đang
// ký bằng private key không thuộc cùng cặp với NEXT_PUBLIC_VAPID_PUBLIC_KEY.
function keysArePair(publicB64u: string, privateB64u: string): { ok: true } | { ok: false; detail: string } {
  try {
    const priv = Buffer.from(privateB64u, "base64url");
    if (priv.length !== 32) return { ok: false, detail: `private key dài ${priv.length} byte (yêu cầu 32)` };
    const ec = crypto.createECDH("prime256v1");
    ec.setPrivateKey(priv);
    const derived = ec.getPublicKey(null, "uncompressed");
    const stored = Buffer.from(publicB64u, "base64url");
    if (stored.length !== 65) return { ok: false, detail: `public key dài ${stored.length} byte (yêu cầu 65)` };
    if (!derived.equals(stored)) {
      return {
        ok: false,
        detail: `public key env không khớp public key suy ra từ private key (env: ${publicB64u.slice(0, 10)}…, derived: ${derived.toString("base64url").slice(0, 10)}…)`,
      };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, detail: `không suy ra được public từ private: ${e?.message || e}` };
  }
}

function ensureConfigured(): { ok: boolean; error?: string } {
  if (configured) return { ok: true };
  if (configError) return { ok: false, error: configError };
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  // Apple (web.push.apple.com) từ chối JWT với BadJwtToken nếu subject không
  // phải mailto:/https: hợp lệ — trim để tránh khoảng trắng lọt từ env.
  const subject = (process.env.VAPID_SUBJECT || "mailto:admin@formatbox.site").trim();
  if (!publicKey || !privateKey) return { ok: false, error: "VAPID chưa cấu hình trên server" };
  const pair = keysArePair(publicKey, privateKey);
  if (!pair.ok) {
    configError = `VAPID public/private không phải một cặp — ${pair.detail}. Chạy \`npx web-push generate-vapid-keys\`, set cả hai biến NEXT_PUBLIC_VAPID_PUBLIC_KEY và VAPID_PRIVATE_KEY cùng lúc, redeploy.`;
    return { ok: false, error: configError };
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return { ok: true };
  } catch (e: any) {
    configError = `VAPID cấu hình sai: ${e?.message || e}`;
    return { ok: false, error: configError };
  }
}

export function hasPushConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

// Endpoint chẩn đoán gọi hàm này để biết cấu hình đang thế nào mà không lộ secret.
export function diagnoseVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject = (process.env.VAPID_SUBJECT || "mailto:admin@formatbox.site").trim();
  const info: Record<string, unknown> = {
    serverTime: new Date().toISOString(),
    subject,
    subjectValid:
      /^mailto:[^@]+@[^@]+$/.test(subject) || /^https:\/\/[^\s]+$/.test(subject),
    hasPublicKey: !!publicKey,
    hasPrivateKey: !!privateKey,
    publicKeyPreview: publicKey ? `${publicKey.slice(0, 10)}…${publicKey.slice(-6)}` : null,
  };
  if (!publicKey || !privateKey) {
    info.pair = "missing";
    return info;
  }
  const pair = keysArePair(publicKey, privateKey);
  info.pair = pair.ok ? "match" : `mismatch — ${pair.detail}`;
  return info;
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

export type AdminPushPayload =
  | { type: "blog-new-post"; slug: string; title: string; done?: boolean }
  | { type: "blog-auto-stopped"; reason: string }
  | { type: "blog-push-test"; title: string };

export type PushSendResult = { sent: number; failed: number; errors: string[] };

// Origin dùng cho link trong thông báo. Job cron không có request của admin
// nên lấy từ env; route "Gửi thử" truyền origin của chính request.
function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://formatbox.site").replace(/\/$/, "");
}

// Nội dung hiển thị + đường dẫn mở khi chạm, cho từng loại thông báo.
function describePush(p: AdminPushPayload): { title: string; body: string; path: string; tag: string } {
  if (p.type === "blog-new-post") {
    return {
      title: p.done ? "Đã sinh xong — bài cuối chờ duyệt" : "Bài blog mới chờ duyệt",
      body: `${p.title || p.slug}\nChạm để Duyệt hoặc Từ chối.`,
      path: `/admin/blog?review=${encodeURIComponent(p.slug)}`,
      tag: `fb-blog-new-${p.slug}`,
    };
  }
  if (p.type === "blog-auto-stopped") {
    return {
      title: "Sinh bài tự động đã dừng",
      body: String(p.reason || "Job đã dừng.").slice(0, 180),
      path: "/admin/blog",
      tag: "fb-blog-auto-stopped",
    };
  }
  return {
    title: "FormatBox Admin — Thông báo thử",
    body: `${p.title || "Thông báo thử"}\nChạm để mở trang quản trị.`,
    path: "/admin/blog",
    tag: "fb-blog-test",
  };
}

// Declarative Web Push (Safari/iOS 18.4+): hệ điều hành tự hiện thông báo và tự
// mở `navigate` khi chạm, không cần service worker — đường notificationclick →
// openWindow trên PWA iOS hay chỉ mở trang bắt đầu của app. Trình duyệt chưa hỗ
// trợ coi đây là payload JSON thường: /sw.js đọc các field gốc (type, slug…)
// được giữ nguyên ở top-level và trong notification.data.
function toWire(p: AdminPushPayload, origin: string): string {
  const d = describePush(p);
  // Lý do dừng có thể rất dài (lỗi của cả chuỗi model) — cắt để payload không
  // vượt giới hạn ~4KB của push service.
  const data = p.type === "blog-auto-stopped" ? { ...p, reason: d.body } : p;
  return JSON.stringify({
    ...data,
    web_push: 8030,
    notification: {
      title: d.title,
      body: d.body,
      navigate: `${origin}${d.path}`,
      tag: d.tag,
      lang: "vi",
      data,
    },
  });
}

// Giữ 1 ngày: điện thoại tắt màn hình / mất mạng vẫn nhận được khi online lại.
// urgency "high" để APNs/FCM đẩy ngay thay vì gom lại khi máy đang ngủ.
const SEND_OPTIONS = { TTL: 60 * 60 * 24, urgency: "high" as const };

async function sendToRows(rows: SubRow[], payload: AdminPushPayload, origin = siteOrigin()): Promise<PushSendResult> {
  const body = toWire(payload, origin);
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
        const rawBody = String(e?.body || e?.message || e);
        // Apple (403 BadJwtToken) nghĩa là cặp VAPID public/private trên server
        // không khớp public key dùng lúc subscribe. Subscription cũ không bao giờ
        // dùng lại được — xoá đi để user bật lại là tạo subscription khớp key hiện tại.
        const badJwt = status === 403 && /BadJwtToken/i.test(rawBody);
        if (status === 404 || status === 410 || badJwt) stale.push(row.id);
        const host = (() => {
          try {
            return new URL(row.endpoint).host;
          } catch {
            return "?";
          }
        })();
        const msg = badJwt
          ? `${host}: 403 BadJwtToken — cặp VAPID public/private trên server không khớp subscription đã lưu. Đã xoá đăng ký cũ; tắt rồi bật lại thông báo trên thiết bị này.`
          : `${host}: ${status || ""} ${rawBody.slice(0, 200)}`.trim();
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
  const cfg = ensureConfigured();
  if (!cfg.ok) return { ...empty, errors: [cfg.error || "VAPID chưa cấu hình"] };
  try {
    const { data, error } = await supabaseAdmin().from("push_subscriptions").select("id,endpoint,p256dh,auth");
    if (error) return { ...empty, errors: [error.message] };
    if (!data || data.length === 0) return empty;
    return await sendToRows(data as SubRow[], payload);
  } catch (e: any) {
    return { ...empty, errors: [e?.message || "Push lỗi"] };
  }
}

// Gửi tới đúng 1 endpoint (nút "Gửi thử" trên thiết bị đang mở). `origin` là
// origin thiết bị đó đang dùng, để chạm vào thông báo mở đúng site (preview/local).
export async function sendPushToEndpoint(
  endpoint: string,
  payload: AdminPushPayload,
  origin?: string,
): Promise<PushSendResult> {
  const empty: PushSendResult = { sent: 0, failed: 0, errors: [] };
  const cfg = ensureConfigured();
  if (!cfg.ok) return { ...empty, errors: [cfg.error || "VAPID chưa cấu hình"] };
  try {
    const { data, error } = await supabaseAdmin()
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("endpoint", endpoint)
      .limit(1);
    if (error) return { ...empty, errors: [error.message] };
    if (!data || data.length === 0) return { ...empty, errors: ["Thiết bị này chưa đăng ký trên server"] };
    return await sendToRows(data as SubRow[], payload, origin);
  } catch (e: any) {
    return { ...empty, errors: [e?.message || "Push lỗi"] };
  }
}

export async function sendBlogNewPostPush(post: { slug: string; title: string }, done = false) {
  return sendAdminPush({ type: "blog-new-post", slug: post.slug, title: post.title, done });
}
