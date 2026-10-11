---
title: "Postgres hay SQLite? Chọn DB cho side-project năm 2026"
slug: postgres-vs-sqlite-2026
category: backend
tags: [database, postgres, sqlite]
excerpt: "SQLite không còn là 'DB đồ chơi'. Khi nào nó đủ dùng, khi nào bắt buộc phải lên Postgres."
cover: /blog/db.svg
readingMinutes: 6
publishedAt: 2026-09-28
author: FormatBox
---

Nhiều người mặc định chọn Postgres cho mọi project. Năm 2026, với sự bùng nổ của Turso, LiteFS và Cloudflare D1, SQLite đã trở thành lựa chọn nghiêm túc cho production — không chỉ cho app desktop.

## SQLite đủ dùng khi

- Workload chủ yếu là **đọc** (blog, docs, dashboard nội bộ).
- Lượng ghi đồng thời < 100 writes/giây.
- Dữ liệu < 100GB.
- Không cần replication multi-region phức tạp (hoặc dùng được Turso/LiteFS).

Với Fly.io + LiteFS hoặc Turso, SQLite replicate được ra edge, latency đọc tính bằng ms.

## Bắt buộc Postgres khi

- Nhiều writer đồng thời (SaaS multi-tenant, chat, transaction tài chính).
- Cần kiểu dữ liệu đặc biệt: `jsonb`, `tsvector`, PostGIS, pgvector.
- Query phức tạp với window function, CTE recursive.
- Cần row-level security, logical replication, hoặc stored procedure PL/pgSQL.

## So sánh nhanh

| Tiêu chí | SQLite | Postgres |
|---|---|---|
| Setup | 0 phút | 5–30 phút |
| Chi phí | Gần như 0 | $5–50/tháng (Neon, Supabase tier thấp) |
| Backup | Copy file | pg_dump, WAL archive |
| Concurrent writes | Hạn chế (WAL mode giúp) | Rất tốt |
| Full-text search | FTS5 (đủ dùng) | tsvector / pg_trgm (mạnh) |
| Vector search | sqlite-vec | pgvector |

## Lời khuyên thực tế

Side-project cá nhân, MVP, blog, công cụ nội bộ → **SQLite + Turso** là đủ, rẻ và nhanh.
SaaS có user trả tiền ngay từ đầu → **Postgres** (Neon/Supabase), đỡ migrate sau này.

Đừng chọn DB vì "nghe sang". Chọn vì nó khớp với workload thực.
