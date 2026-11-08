import { normDykQuiz, type DidYouKnowItem, type DidYouKnowQuizQuestion } from "@/lib/blog";
import { callLlm, parseJsonLoose } from "@/lib/blog-ai";
import type { AiProvider } from "@/lib/blog-ai-shared";

// Models favour one answer position, so the order is randomised before saving.
function shuffleOptions(q: DidYouKnowQuizQuestion): DidYouKnowQuizQuestion {
  const order = q.options_vi.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    options_vi: order.map((i) => q.options_vi[i]),
    options_en: order.map((i) => q.options_en[i]),
    answer: order.indexOf(q.answer),
  };
}

export async function generateDykQuiz(
  item: Pick<DidYouKnowItem, "title_vi" | "intro_vi" | "images">,
  provider: AiProvider,
): Promise<DidYouKnowQuizQuestion[]> {
  const captions = item.images
    .map((im) => im.caption_vi)
    .filter(Boolean)
    .join("; ");

  const r = await callLlm({
    provider,
    json: true,
    temperature: 0.6,
    timeoutMs: 45_000,
    maxTokens: 1800,
    system:
      "Bạn là giám tuyển của một bảo tàng tri thức, soạn câu đố song ngữ VI/EN cho khách vừa xem xong một hiện vật. Chỉ trả JSON hợp lệ, không giải thích.",
    user: `Hiện vật:
- Tiêu đề: ${item.title_vi}
- Mô tả: ${item.intro_vi}
- Chú thích ảnh: ${captions || "(không có)"}

Soạn đúng 3 câu hỏi trắc nghiệm, mỗi câu 4 lựa chọn, chỉ 1 đáp án đúng.

Yêu cầu:
- Chỉ dùng thông tin có trong hiện vật ở trên, không thêm sự kiện mới. Khách đã xem kỹ phải trả lời được.
- Câu hỏi ngắn, gợi tò mò. Đáp án sai phải hợp lý, không lộ liễu.
- answer là vị trí đáp án đúng trong mảng options (bắt đầu từ 0).
- explain: 1 câu giải thích vì sao đáp án đúng.

JSON: {"quiz":[{"q_vi":"...","q_en":"...","options_vi":["...","...","...","..."],"options_en":["...","...","...","..."],"answer":0,"explain_vi":"...","explain_en":"..."}]}`,
  });

  const quiz = normDykQuiz(parseJsonLoose<{ quiz?: unknown }>(r.text)?.quiz).slice(0, 3);
  if (quiz.length === 0) throw new Error("AI trả về quiz không hợp lệ");
  return quiz.map(shuffleOptions);
}
