/* FormatBox fuel-price notification service worker.
 *
 * Mục tiêu: cho phép người dùng nhận thông báo khi giá xăng đổi, kể cả khi
 * tab FormatBox không mở. Dùng Periodic Background Sync (Chromium) để thức
 * dậy định kỳ, so sánh signature giá với lần check trước, bắn notification
 * nếu khác. Signature lưu trong Cache Storage (bền giữa các lần wake).
 */

// Bump version mỗi lần đổi format notification để ép Chrome lấy SW mới.
const SW_VERSION = "fb-fuel-v4";
const CACHE_NAME = SW_VERSION;
const SIG_URL = "/__fb_fuel_sig__";
const PERIODIC_TAG = "fuel-check";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Minimal fetch handler — pass-through. Chrome dùng sự tồn tại của fetch
// handler làm 1 trong các điều kiện "installability" cho PWA.
self.addEventListener("fetch", () => {});

async function readLastSig() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(SIG_URL);
    if (!res) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function writeLastSig(sig) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(SIG_URL, new Response(sig));
  } catch {}
}

function signatureOf(items) {
  return [...items]
    .sort((a, b) => a.kind.localeCompare(b.kind))
    .map((it) => `${it.kind}:${it.price}`)
    .join("|");
}

async function fetchSnapshot() {
  const res = await fetch("/api/fuel", { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

const KIND_LABEL = {
  e10_ron95: "E10 RON 95",
  e5_ron92: "E5 RON 92",
  diesel: "Diesel",
  kerosene: "Dầu hoả",
  mazut: "Mazut",
};

function fmtVND(n) {
  return Number(n).toLocaleString("vi-VN");
}

function buildBody(items) {
  // Ưu tiên các loại có `change` != 0 cho súc tích; nếu không có, lấy top 3.
  const changed = items.filter((it) => typeof it.change === "number" && it.change !== 0);
  const list = (changed.length > 0 ? changed : items).slice(0, 3);
  return list
    .map((it) => {
      const label = KIND_LABEL[it.kind] || it.kind;
      const price = `${fmtVND(it.price)}đ/${it.unit}`;
      if (typeof it.change === "number" && it.change !== 0) {
        const dir = it.change > 0 ? "▲" : "▼";
        return `${label}: ${price} (${dir}${fmtVND(Math.abs(it.change))})`;
      }
      return `${label}: ${price}`;
    })
    .join("\n");
}

async function showPriceNotification(snap, { testPrefix = false } = {}) {
  const title = `${testPrefix ? "[TEST] " : ""}Giá xăng vừa cập nhật`;
  const body = buildBody(snap.items) || "Có kỳ điều chỉnh giá xăng/dầu mới. Bấm để xem chi tiết.";
  await self.registration.showNotification(title, {
    body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "fb-fuel",
    renotify: true,
    requireInteraction: false,
    data: { url: "/fuel" },
  });
}

async function checkAndNotify({ force = false, testPrefix = false } = {}) {
  let snap;
  try {
    snap = await fetchSnapshot();
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }
  if (!snap || !Array.isArray(snap.items) || snap.items.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (snap.source === "fallback") {
    return { ok: false, reason: "fallback" };
  }
  const sig = signatureOf(snap.items);
  const prev = await readLastSig();
  const changed = prev !== null && prev !== sig;
  await writeLastSig(sig);
  if (changed || force) {
    await showPriceNotification(snap, { testPrefix });
    return { ok: true, changed: true };
  }
  return { ok: true, changed: false };
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === PERIODIC_TAG) {
    event.waitUntil(checkAndNotify());
  }
});

// Fallback: Background Sync one-shot (dùng khi periodicSync không khả dụng).
self.addEventListener("sync", (event) => {
  if (event.tag === PERIODIC_TAG) {
    event.waitUntil(checkAndNotify());
  }
});

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "fuel-check") {
    event.waitUntil(checkAndNotify({ force: !!msg.force }));
  } else if (msg.type === "fuel-reset-sig") {
    event.waitUntil(writeLastSig(""));
  } else if (msg.type === "fuel-test") {
    // Bắn đúng loại thông báo người dùng sẽ thấy khi có biến động giá thật —
    // fetch snapshot mới nhất và hiển thị nội dung thật (ép hiện dù signature
    // không đổi).
    event.waitUntil(checkAndNotify({ force: true, testPrefix: true }));
  }
});

// Blog new-post notifications include an admin action id — handle those before
// falling back to the generic "focus/open window" behavior used for fuel.
async function handleBlogAction(event) {
  const data = event.notification.data || {};
  const slug = data.slug;
  if (!slug) return;
  const path = event.action === "approve" ? "/api/blog/approve" : "/api/blog/reject";
  const label = event.action === "approve" ? "Đã duyệt" : "Đã từ chối";
  try {
    const res = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const ok = res.ok;
    await self.registration.showNotification(ok ? `${label}: ${data.title || slug}` : "Thao tác lỗi", {
      body: ok ? "Hoàn tất từ thông báo." : `Không ${event.action === "approve" ? "duyệt" : "từ chối"} được bài. Mở trang admin để thử lại.`,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: `fb-blog-ack-${slug}`,
      data: { url: "/admin/blog" },
    });
    // Nhắc tab admin đang mở refresh danh sách.
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of all) {
      try {
        if (new URL(client.url).pathname.startsWith("/admin/blog")) {
          client.postMessage({ type: "blog-post-acted", slug, action: event.action, ok });
        }
      } catch {}
    }
  } catch {
    await self.registration.showNotification("Thao tác lỗi", {
      body: "Không gọi được API. Mở trang admin để thử lại.",
      icon: "/icon.svg",
      tag: `fb-blog-ack-${slug}`,
      data: { url: "/admin/blog" },
    });
  }
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  const isBlog = typeof event.notification.tag === "string" && event.notification.tag.startsWith("fb-blog-");
  event.notification.close();
  // Blog "approve" / "reject" chạy nền, không mở tab.
  if (isBlog && (event.action === "approve" || event.action === "reject")) {
    event.waitUntil(handleBlogAction(event));
    return;
  }
  const url = data.url || "/fuel";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        try {
          const u = new URL(client.url);
          if (u.pathname === url || (url.startsWith("/admin/blog") && u.pathname.startsWith("/admin/blog"))) {
            await client.focus();
            return;
          }
        } catch {}
      }
      await self.clients.openWindow(url);
    })(),
  );
});
