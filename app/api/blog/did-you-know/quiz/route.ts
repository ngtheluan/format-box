import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { getDykConfig, listAdminDidYouKnow, updateDidYouKnow, type DidYouKnowImage } from "@/lib/blog";
import { AI_MODELS, type AiProvider } from "@/lib/blog-ai-shared";
import { generateDykQuiz } from "@/lib/dyk-quiz";
import { clampQuizCount, normQuizScope } from "@/lib/dyk-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Soạn + kiểm chứng là hai lượt gọi AI nối tiếp.
export const maxDuration = 120;

type Draft = { tag_vi?: string; title_vi?: string; intro_vi?: string; images?: DidYouKnowImage[] };

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    // Nội dung đang sửa trong form (chưa lưu) — sinh quiz mà không ghi DB.
    draft?: Draft;
    provider?: AiProvider;
    count?: number;
    scope?: string;
    verify?: boolean;
  };
  const slug = (body.slug || "").trim();
  const draft = body.draft && typeof body.draft === "object" ? body.draft : null;
  if (!slug && !draft) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  const provider: AiProvider = body.provider && body.provider in AI_MODELS ? body.provider : "groq";

  try {
    const cfg = await getDykConfig(true);
    const opts = {
      count: clampQuizCount(body.count, cfg.quiz_count),
      scope: normQuizScope(body.scope, cfg.quiz_scope),
      verify: typeof body.verify === "boolean" ? body.verify : cfg.quiz_verify,
    };

    if (draft) {
      const title_vi = (draft.title_vi || "").toString().trim();
      if (!title_vi) return NextResponse.json({ error: "Thiếu tiêu đề VI" }, { status: 400 });
      const gen = await generateDykQuiz(
        {
          tag_vi: (draft.tag_vi || "").toString(),
          title_vi,
          intro_vi: (draft.intro_vi || "").toString(),
          images: Array.isArray(draft.images) ? draft.images.filter((im) => im && typeof im === "object") : [],
        },
        provider,
        opts,
      );
      return NextResponse.json({ ok: true, count: gen.quiz.length, ...gen });
    }

    const items = await listAdminDidYouKnow();
    const item = items.find((it) => it.slug === slug);
    if (!item) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const gen = await generateDykQuiz(item, provider, opts);
    await updateDidYouKnow(slug, { quiz: gen.quiz });
    // Đọc lại để chắc chắn quiz đã nằm trong DB (cột `quiz` có thể chưa được
    // migrate; lúc đó update không báo lỗi nhưng dữ liệu không nhận).
    const saved = (await listAdminDidYouKnow()).find((it) => it.slug === slug);
    if (!saved?.quiz?.length) {
      return NextResponse.json(
        { error: "Đã sinh nhưng không lưu được — kiểm tra cột `quiz` trong blog_did_you_know" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, ...gen, count: saved.quiz.length, quiz: saved.quiz });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI lỗi" }, { status: 500 });
  }
}
