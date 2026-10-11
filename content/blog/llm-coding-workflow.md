---
title: "Workflow code cùng LLM: 5 thói quen tiết kiệm nửa thời gian"
slug: llm-coding-workflow
category: ai
tags: [ai, llm, productivity]
excerpt: "Dùng LLM đúng cách khác xa với 'copy prompt rồi paste code'. Vài thói quen nhỏ thay đổi hiệu suất rõ rệt."
cover: /blog/ai.svg
readingMinutes: 7
publishedAt: 2026-10-02
author: FormatBox
---

Sau một năm làm việc hằng ngày với Claude Code, Cursor và Copilot, mình đúc kết 5 thói quen giúp giảm hẳn thời gian code — không phải mẹo prompt lạ, mà là cách tổ chức công việc.

## 1. Viết ý định trước, code sau

Thay vì gõ "fix bug này" rồi paste stack trace, viết một đoạn ngắn:

- Mình đang làm gì
- Hành vi mong đợi
- Hành vi thực tế
- Điều đã thử

LLM không có context như teammate ngồi cạnh. Bỏ 30 giây mô tả tiết kiệm vài vòng ping-pong.

## 2. Chia task thành đơn vị **có thể review**

Prompt kiểu "viết toàn bộ auth system" trả về 400 dòng không ai đọc nổi. Chia nhỏ: schema → migration → endpoint → middleware → test. Review từng bước.

## 3. Luôn giữ một **test chạy được**

Khi có test, bạn có thể để LLM tự loop: viết code → chạy test → sửa. Không có test, mỗi lần sửa đều phải manual verify, chậm gấp 10.

## 4. Dừng khi output "quá tự tin một cách đáng ngờ"

LLM tự tin nhất khi nó sai. Nếu nó khẳng định một API nhưng bạn chưa thấy trong docs → check docs. Đừng tin, đừng copy mù.

## 5. Lưu lại prompt tốt

Những prompt bạn dùng đi dùng lại (code review, refactor, test generation) → lưu thành snippet hoặc slash command. Mỗi tuần tiết kiệm hàng giờ gõ lại.

## Bonus: biết khi nào **không** dùng LLM

- Code 2–3 dòng: tự gõ nhanh hơn mô tả.
- Đọc hiểu codebase mới: tự đọc, LLM dễ "hallucinate" cấu trúc.
- Bug về performance hoặc concurrency: cần instrument thật, LLM đoán sai nhiều.

LLM là tool, không phải thay thế judgement. Dùng đúng chỗ, tiết kiệm thời gian; dùng sai chỗ, tốn thêm thời gian debug code của chính nó.
