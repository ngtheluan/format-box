"use client";
// Phía trình duyệt của Web Push cho admin blog: đăng ký /sw.js, xin quyền,
// tạo subscription và gửi lên server. Dùng chung cho BlogAdminTool và PushSetup.

export type PushState =
  | "checking"
  | "ios-install" // iPhone/iPad trong tab Safari: phải Thêm vào MH chính
  | "unsupported"
  | "no-vapid"
  | "denied"
  | "default"
  | "granted";

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function getPushState(): PushState {
  if (typeof window === "undefined") return "checking";
  const supported = "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
  if (!supported) return isIOS() && !isStandalone() ? "ios-install" : "unsupported";
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "no-vapid";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" ? "granted" : "default";
}

export async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    return existing || (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  } catch {
    return null;
  }
}

// Tạo (hoặc lấy lại) subscription và đồng bộ lên server. Trả về endpoint.
export async function syncPushSubscription(): Promise<string> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error("Server chưa cấu hình VAPID key");
  const reg = (await getSwRegistration()) || (await navigator.serviceWorker.ready);
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapidKey),
    });
  }
  const json = sub.toJSON();
  const r = await fetch("/api/blog/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    credentials: "same-origin",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => null);
    throw new Error(j?.error || `Lưu đăng ký lỗi (${r.status})`);
  }
  return json.endpoint || sub.endpoint;
}

// Gọi trực tiếp trong click handler: Safari chỉ cho requestPermission() khi có
// user gesture, và lời gọi phải xảy ra trước bất kỳ `await` nào.
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof Notification === "undefined") return { ok: false, error: "Trình duyệt không hỗ trợ thông báo" };
  try {
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "Chưa cấp quyền thông báo" };
    await syncPushSubscription();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) };
  }
}

// Xoá subscription hiện tại (cả ở browser và server) rồi tạo mới — dùng khi
// VAPID key đổi phía server và subscription cũ vĩnh viễn bị Apple từ chối.
export async function resetPushSubscription(): Promise<{ ok: boolean; error?: string }> {
  try {
    const reg = (await getSwRegistration()) || (await navigator.serviceWorker.ready);
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      const endpoint = existing.endpoint;
      try {
        await existing.unsubscribe();
      } catch {}
      try {
        await fetch("/api/blog/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
          credentials: "same-origin",
        });
      } catch {}
    }
    await syncPushSubscription();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) };
  }
}

export async function sendTestPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const endpoint = await syncPushSubscription();
    const r = await fetch("/api/blog/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
      credentials: "same-origin",
    });
    if (r.ok) return { ok: true };
    const j = await r.json().catch(() => null);
    return { ok: false, error: j?.error || `Lỗi ${r.status}` };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) };
  }
}
