import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import {
  dykImageCredit,
  getDykConfig,
  slugify,
  updateDidYouKnow,
  upsertDidYouKnow,
  type DidYouKnowImage,
  type DidYouKnowItem,
} from "@/lib/blog";
import { callLlm, parseJsonLoose, searchImages } from "@/lib/blog-ai";
import { AI_MODELS, type AiProvider } from "@/lib/blog-ai-shared";
import { generateDykQuiz } from "@/lib/dyk-quiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type GenShape = {
  slug?: string;
  tag_vi?: string;
  tag_en?: string;
  title_vi?: string;
  title_en?: string;
  intro_vi?: string;
  intro_en?: string;
  images?: { query?: string; caption_vi?: string; caption_en?: string }[];
};

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    topic?: string;
    provider?: AiProvider;
    count?: number;
  };
  const provider: AiProvider = body.provider && body.provider in AI_MODELS ? body.provider : "groq";
  const topic = (body.topic || "").trim();
  const count = Math.max(3, Math.min(8, Number(body.count) || 6));

  try {
    const r = await callLlm({
      provider,
      json: true,
      temperature: 0.85,
      timeoutMs: 45_000,
      maxTokens: 1200,
      system:
        "Bạn là giám tuyển một bảo tàng số 'Có thể bạn chưa biết'. Mỗi mục là một sự thật thú vị, bất ngờ, chính xác — ảnh minh họa và chú thích PHẢI bám sát chủ đề mục đó, không được rời đề. Chỉ trả JSON hợp lệ, không giải thích.",
      user: `${
        topic ? `Chủ đề: "${topic}".` : "Tự chọn một chủ đề thú vị bất kỳ (thiên nhiên, vũ trụ, lịch sử, khoa học, ẩm thực, động vật…)."
      } Soạn 1 mục 'Có thể bạn chưa biết' song ngữ VI/EN.

Yêu cầu:
- title: ngắn, gợi tò mò (40-70 ký tự).
- intro: 1-2 câu súc tích giải thích sự thật đó.
- tag: 1 từ phân loại chủ đề (VD: Thiên nhiên, Vũ trụ, Lịch sử).
- images: ${count} ảnh minh họa — MỖI ảnh phải khắc hoạ MỘT khía cạnh cụ thể của chính sự thật ở trên (không ảnh tổng quát, không ảnh chỉ về chủ đề rộng).
  + "query": tiếng Anh 3-5 từ CỤ THỂ, nêu rõ đối tượng/hiện tượng xuất hiện trong ảnh (VD: "purple aurora iceland sky", không chỉ "aurora").
  + "caption_vi" / "caption_en": <= 50 ký tự, gắn trực tiếp với điều ảnh đó minh họa, không dùng chung chung.

JSON: {"slug":"kebab-case","tag_vi":"...","tag_en":"...","title_vi":"...","title_en":"...","intro_vi":"...","intro_en":"...","images":[{"query":"...","caption_vi":"...","caption_en":"..."}]}`,
    });
    const j = parseJsonLoose<GenShape>(r.text);
    if (!j?.title_vi) return NextResponse.json({ error: "AI trả về dữ liệu không hợp lệ" }, { status: 502 });

    const title_vi = (j.title_vi || "").trim();
    const slug = slugify((j.slug || title_vi).trim()) || `dyk-${Date.now()}`;

    // Resolve images via searchImages (first candidate per query).
    const queries = (j.images || []).slice(0, count);
    const resolved = await Promise.all(
      queries.map(async (im) => {
        const q = (im.query || "").trim();
        if (!q) return null;
        const list = await searchImages(q, 4);
        const pick = list[0];
        if (!pick) return null;
        return {
          url: pick.url,
          caption_vi: (im.caption_vi || "").trim(),
          caption_en: (im.caption_en || im.caption_vi || "").trim(),
          ...dykImageCredit({ credit: pick.credit, credit_url: pick.creditUrl }),
        } as DidYouKnowImage;
      }),
    );
    const images = resolved.filter(Boolean) as DidYouKnowImage[];

    const item: DidYouKnowItem = {
      slug,
      tag_vi: (j.tag_vi || "").trim(),
      tag_en: (j.tag_en || j.tag_vi || "").trim(),
      title_vi,
      title_en: (j.title_en || "").trim(),
      intro_vi: (j.intro_vi || "").trim(),
      intro_en: (j.intro_en || "").trim(),
      images,
      sort: Date.now() % 100000,
      active: true,
    };
    await upsertDidYouKnow(item);

    // Separate and guarded: a failed quiz (or a DB without the `quiz` column yet)
    // must not lose the exhibit that was just saved.
    let quizSaved = true;
    let quizError = "";
    try {
      const cfg = await getDykConfig(true);
      const gen = await generateDykQuiz(item, provider, {
        count: cfg.quiz_count,
        scope: cfg.quiz_scope,
        verify: cfg.quiz_verify,
      });
      await updateDidYouKnow(slug, { quiz: gen.quiz });
    } catch (e: any) {
      quizSaved = false;
      quizError = e?.message || "Lỗi sinh quiz";
    }
    return NextResponse.json({ ok: true, item, quizSaved, ...(quizError ? { quizError } : {}) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI lỗi" }, { status: 500 });
  }
}
