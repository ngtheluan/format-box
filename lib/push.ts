// Web Push: gửi notification tới các trình duyệt đã subscribe, kể cả khi tab
// admin đã đóng. Subscription lưu ở Supabase (`push_subscriptions`); endpoint
// hết hạn (404/410) sẽ bị xoá tự động.
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@formatbox.site";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function hasPushConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

export type BlogPushPayload = {
  type: "blog-new-post";
  slug: string;
  title: string;
};

export async function sendBlogNewPostPush(post: { slug: string; title: string }): Promise<void> {
  if (!ensureConfigured()) return;
  const db = supabaseAdmin();
  const { data, error } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth");
  if (error || !data || data.length === 0) return;
  const payload: BlogPushPayload = { type: "blog-new-post", slug: post.slug, title: post.title };
  const body = JSON.stringify(payload);
  const stale: string[] = [];
  await Promise.all(
    (data as SubRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
          { TTL: 60 * 10 },
        );
      } catch (e: any) {
        const status = Number(e?.statusCode);
        if (status === 404 || status === 410) stale.push(row.id);
      }
    }),
  );
  if (stale.length) {
    await db.from("push_subscriptions").delete().in("id", stale);
  }
}
