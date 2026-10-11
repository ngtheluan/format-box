---
title: "Next.js 14 App Router: những điểm cần biết trước khi dùng"
slug: next-js-14-app-router
category: web
tags: [nextjs, react, ssr]
excerpt: "Server Components, streaming, caching nhiều tầng — App Router mạnh nhưng dễ sai nếu không hiểu mô hình."
cover: /blog/next.svg
readingMinutes: 8
publishedAt: 2026-09-20
author: FormatBox
---

App Router của Next.js 14 là một bước nhảy đáng kể so với Pages Router. Thay vì chỉ là tổ chức file khác, nó thay đổi toàn bộ mô hình render, caching và data-fetching.

## Server Components là mặc định

Mỗi file trong `app/` mặc định là **Server Component** — chạy trên server, không gửi JS về client. Chỉ khi bạn thêm `"use client"` ở đầu file thì component mới chạy ở client.

> Hệ quả: bundle JS giảm đáng kể, nhưng bạn không được dùng `useState`, `useEffect`, hay event handler trong Server Component.

## 4 tầng cache cần nhớ

Next.js 14 có 4 tầng cache đan xen:

1. **Request Memoization** — `fetch()` trùng URL trong cùng một request chỉ chạy một lần.
2. **Data Cache** — kết quả `fetch()` được lưu lại giữa các request.
3. **Full Route Cache** — HTML của route tĩnh được build sẵn.
4. **Router Cache** — client-side cache cho navigation.

Hiểu sai một tầng là có thể thấy data "cũ bất thường" trong production.

## Khi nào cần Client Component

- Có state cục bộ (form, modal, toggle).
- Dùng browser API (`localStorage`, `IntersectionObserver`).
- Cần event handler (`onClick`, `onChange`).

Mẹo: giữ `"use client"` ở component **lá** nhất có thể. Nếu bạn đặt ở layout, cả cây con biến thành client.

## Server Actions

Thay cho API route, bạn có thể viết hàm server inline và gọi trực tiếp từ form:

```tsx
async function createPost(formData: FormData) {
  "use server";
  await db.insert({ title: formData.get("title") });
}
```

Form sẽ hoạt động cả khi JS chưa load — progressive enhancement thật sự.

## Khi nào **không** nên dùng App Router

- Project cũ dùng nhiều `getServerSideProps` phức tạp, migration tốn công.
- Team chưa quen RSC — dễ render component sai môi trường.
- Dự án cần nhiều middleware per-route — Pages Router linh hoạt hơn ở điểm này.

Nếu bắt đầu mới hôm nay, chọn App Router. Nếu dự án đang chạy ổn với Pages Router, không cần migrate chỉ để migrate.
