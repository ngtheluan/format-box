---
title: "Edge Runtime vs Serverless: khác biệt thật sự ở đâu"
slug: edge-vs-serverless
category: devops
tags: [edge, serverless, performance]
excerpt: "Edge nhanh hơn, nhưng không phải lúc nào cũng là lựa chọn đúng. Phân biệt để chọn cho đúng use-case."
cover: /blog/edge.svg
readingMinutes: 5
publishedAt: 2026-10-05
author: FormatBox
---

"Edge" được marketing như là serverless phiên bản nhanh hơn. Thực tế hai thứ này **khác về kiến trúc**, không chỉ về vị trí triển khai.

## Serverless (AWS Lambda, Vercel Functions)

- Chạy trong **container** (Node.js, Python runtime đầy đủ).
- Cold start: 100ms–3s tùy ngôn ngữ.
- Có filesystem tạm, access được package npm bất kỳ.
- Chạy ở 1 region cố định.

## Edge Runtime (Cloudflare Workers, Vercel Edge, Deno Deploy)

- Chạy trên **V8 isolate**, không có Node.js API đầy đủ.
- Cold start: ~5ms.
- Không có filesystem, không `fs`, không nhiều npm package.
- Chạy ở **hàng trăm location** gần user.

## Chọn Edge khi

- Middleware (auth, rewrite, AB test) — latency rất quan trọng.
- Streaming response, SSE.
- Response đơn giản, chủ yếu I/O ra DB có edge replica (Turso, Upstash).

## Chọn Serverless khi

- Cần npm package nặng (puppeteer, sharp, ffmpeg).
- Logic CPU-bound dài > 50ms.
- Access DB truyền thống (Postgres, MySQL) không có connection pooler edge.
- Cần filesystem để xử lý file tạm.

## Cạm bẫy phổ biến

**Dùng Edge rồi gọi Postgres thẳng** → mỗi request mở connection mới, DB sập trong vài phút. Giải pháp: dùng pooler (Neon, Supabase pooler, Prisma Accelerate).

**Dùng Serverless rồi than cold start** → warm up pattern, provisioned concurrency, hoặc đổi sang Edge nếu code đơn giản.

Chọn runtime là chọn ràng buộc. Hiểu ràng buộc trước khi chọn.
