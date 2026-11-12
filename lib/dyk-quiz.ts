import { normDykQuiz, type DidYouKnowItem, type DidYouKnowQuizQuestion } from "@/lib/blog";
import { availableProviders, callLlm, parseJsonLoose } from "@/lib/blog-ai";
import { AI_PROVIDER_ORDER, type AiProvider } from "@/lib/blog-ai-shared";
import { clampQuizCount, type DykQuizScope } from "@/lib/dyk-shared";

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

export type DykQuizOptions = {
  count?: number;
  scope?: DykQuizScope;
  verify?: boolean;
};

export type DykQuizResult = {
  quiz: DidYouKnowQuizQuestion[];
  // Lượt kiểm chứng có chạy được không, và có tra cứu web thật hay chỉ dựa vào model.
  verified: boolean;
  searched: boolean;
  dropped: number;
};

type QuizSource = Pick<DidYouKnowItem, "title_vi" | "intro_vi" | "images"> & { tag_vi?: string };

const SCOPE_RULES: Record<DykQuizScope, string> = {
  exhibit: `- CHỈ hỏi về chi tiết có trong hiện vật ở trên (không thêm sự kiện/dữ liệu mới). Khách đọc kỹ phần mô tả và chú thích ảnh phải trả lời được.
- Ưu tiên liên hệ trực tiếp đến những gì ảnh minh họa cho thấy (vật thể, màu sắc, địa điểm, con số nêu trong chú thích).
- Mọi câu ghi "scope":"exhibit".`,
  topic: `- Hỏi kiến thức MỞ RỘNG về chính chủ đề của hiện vật: nguyên lý, lịch sử, con người, địa danh, con số liên quan. Câu hỏi không cần có sẵn trong mô tả, nhưng phải gắn chặt với chủ đề — không lạc sang chủ đề khác.
- Mọi câu ghi "scope":"topic".`,
  mixed: `- Khoảng một nửa số câu bám sát chi tiết có trong hiện vật (ghi "scope":"exhibit"), khách đọc kỹ mô tả và chú thích là trả lời được.
- Số còn lại hỏi kiến thức MỞ RỘNG về chính chủ đề đó: nguyên lý, lịch sử, con người, địa danh, con số liên quan (ghi "scope":"topic"). Không lạc sang chủ đề khác.`,
};

const ACCURACY_RULES = `Độ chính xác là bắt buộc:
- Chỉ dùng dữ kiện ổn định, được thừa nhận rộng rãi (mức sách giáo khoa, bách khoa toàn thư). Không chắc chắn thì KHÔNG hỏi.
- Không hỏi số liệu thay đổi theo thời gian (dân số, kỷ lục, giá cả, xếp hạng, "mới nhất") và điều còn tranh cãi.
- Con số phải đúng và kèm đơn vị. Nếu là giá trị xấp xỉ thì ghi "khoảng", và các lựa chọn sai phải cách đủ xa để không ai cãi được.
- Tránh "đầu tiên", "lớn nhất", "duy nhất" trừ khi đó là sự thật không thể tranh cãi.
- Đúng 1 đáp án đúng; mỗi đáp án sai phải sai rõ ràng về dữ kiện, không được "đúng một phần".
- Không bịa tên riêng, năm tháng, trích dẫn.`;

function describe(item: QuizSource): string {
  const captions = item.images
    .map((im) => im.caption_vi)
    .filter(Boolean)
    .join("; ");
  return `Hiện vật:
- Chủ đề: ${item.tag_vi || "(không ghi)"}
- Tiêu đề: ${item.title_vi}
- Mô tả: ${item.intro_vi}
- Chú thích ảnh: ${captions || "(không có)"}`;
}

// Lượt thứ hai, độc lập với lượt soạn: giữ lại câu mà người kiểm chứng xác nhận
// đáp án đúng, chỉ có một đáp án đúng và dữ kiện không sai.
async function verifyQuiz(
  item: QuizSource,
  quiz: DidYouKnowQuizQuestion[],
  provider: AiProvider,
): Promise<{ keep: boolean[]; searched: boolean } | null> {
  const list = quiz
    .map(
      (q, i) =>
        `#${i} [${q.scope === "topic" ? "mở rộng" : "trong hiện vật"}] ${q.q_vi}\n${q.options_vi
          .map((o, k) => `  ${k}. ${o}`)
          .join("\n")}\n  Đáp án được chọn: ${q.answer}\n  Lời giải: ${q.explain_vi || "(không có)"}`,
    )
    .join("\n\n");

  try {
    const r = await callLlm({
      provider,
      json: true,
      webSearch: true,
      temperature: 0,
      timeoutMs: 40_000,
      maxTokens: 1400,
      system:
        "Bạn là biên tập viên kiểm chứng dữ kiện, rất khó tính. Nhiệm vụ: rà từng câu đố và chỉ cho qua câu nào bạn CHẮC CHẮN đúng. Nếu có công cụ tìm kiếm thì tra cứu để đối chiếu. Chỉ trả JSON hợp lệ.",
      user: `${describe(item)}

Các câu đố cần kiểm chứng:

${list}

Với MỖI câu, tự xác định đáp án đúng rồi đánh giá. Đặt "ok": false khi gặp bất kỳ điều nào sau:
- Đáp án được chọn không phải đáp án đúng.
- Có từ hai lựa chọn trở lên có thể coi là đúng, hoặc không lựa chọn nào đúng.
- Câu hỏi, đáp án hoặc lời giải chứa dữ kiện/con số/năm tháng/tên riêng sai.
- Số liệu dễ lỗi thời hoặc còn tranh cãi.
- Câu "trong hiện vật" nhưng mô tả ở trên không đủ căn cứ để trả lời.
- Bạn không đủ chắc chắn.

JSON: {"checks":[{"i":0,"ok":true,"answer":0,"reason":"..."}]}`,
    });
    const checks = parseJsonLoose<{ checks?: unknown }>(r.text)?.checks;
    if (!Array.isArray(checks)) return null;
    const keep = quiz.map(() => false);
    let seen = 0;
    for (const c of checks) {
      if (!c || typeof c !== "object") continue;
      const o = c as { i?: unknown; ok?: unknown; answer?: unknown };
      const i = Number(o.i);
      if (!Number.isInteger(i) || i < 0 || i >= quiz.length) continue;
      seen++;
      keep[i] = o.ok === true && Number(o.answer) === quiz[i].answer;
    }
    // Người kiểm chứng bỏ sót quá nhiều câu thì coi như lượt này không dùng được.
    if (seen < Math.ceil(quiz.length / 2)) return null;
    return { keep, searched: r.searched };
  } catch {
    return null;
  }
}

// Ưu tiên một nhà cung cấp khác với lượt soạn để hai lượt không cùng một điểm mù.
function verifierProvider(writer: AiProvider): AiProvider {
  const avail = availableProviders();
  return AI_PROVIDER_ORDER.find((p) => p !== writer && p !== "pollinations" && avail[p]) ?? writer;
}

export async function generateDykQuiz(
  item: QuizSource,
  provider: AiProvider,
  opts: DykQuizOptions = {},
): Promise<DykQuizResult> {
  const count = clampQuizCount(opts.count);
  const scope: DykQuizScope = opts.scope ?? "mixed";
  const verify = opts.verify !== false;
  // Soạn dư để sau khi loại câu không qua kiểm chứng vẫn đủ số lượng.
  const ask = verify ? count + Math.min(3, Math.max(1, Math.ceil(count / 2))) : count;

  const r = await callLlm({
    provider,
    json: true,
    temperature: 0.5,
    timeoutMs: 45_000,
    maxTokens: 700 + ask * 420,
    system:
      "Bạn là giám tuyển của một bảo tàng tri thức, soạn câu đố song ngữ VI/EN cho khách vừa xem xong một hiện vật. Mọi dữ kiện, con số, tên riêng và mốc thời gian trong câu hỏi, đáp án, lời giải PHẢI chính xác và kiểm chứng được. Chỉ trả JSON hợp lệ, không giải thích.",
    user: `${describe(item)}

Soạn đúng ${ask} câu hỏi trắc nghiệm, mỗi câu 4 lựa chọn, chỉ 1 đáp án đúng.

Phạm vi câu hỏi:
${SCOPE_RULES[scope]}

${ACCURACY_RULES}

Trình bày:
- Câu hỏi ngắn, gợi tò mò, không trùng ý nhau. Đáp án sai phải hợp lý, không lộ liễu.
- answer là vị trí đáp án đúng trong mảng options (bắt đầu từ 0).
- explain: 1-2 câu nêu dữ kiện làm căn cứ. Câu "exhibit" thì chỉ ra chỗ trong hiện vật nói điều đó; câu "topic" thì nêu rõ sự thật được dùng.
- Bản EN dịch sát bản VI, giữ nguyên thứ tự lựa chọn.

JSON: {"quiz":[{"scope":"exhibit","q_vi":"...","q_en":"...","options_vi":["...","...","...","..."],"options_en":["...","...","...","..."],"answer":0,"explain_vi":"...","explain_en":"..."}]}`,
  });

  const drafted = normDykQuiz(parseJsonLoose<{ quiz?: unknown }>(r.text)?.quiz).slice(0, ask);
  if (drafted.length === 0) throw new Error("AI trả về quiz không hợp lệ");

  // Không có nhãn thì suy ra từ phạm vi đã chọn để giao diện gắn nhãn đúng.
  const tagged = drafted.map((q) => ({ ...q, scope: q.scope ?? (scope === "topic" ? "topic" : "exhibit") }));

  let kept = tagged;
  let verified = false;
  let searched = false;
  if (verify) {
    const check = await verifyQuiz(item, tagged, verifierProvider(provider));
    if (check) {
      verified = true;
      searched = check.searched;
      kept = tagged.filter((_, i) => check.keep[i]);
      if (kept.length === 0) throw new Error("Không câu nào qua bước kiểm chứng — thử sinh lại");
    }
  }

  const quiz = kept.slice(0, count).map(shuffleOptions);
  return { quiz, verified, searched, dropped: tagged.length - kept.length };
}
