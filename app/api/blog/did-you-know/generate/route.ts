import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { slugify, upsertDidYouKnow, type DidYouKnowImage, type DidYouKnowItem } from "@/lib/blog";
import { callLlm, parseJsonLoose, searchImages } from "@/lib/blog-ai";
import { AI_MODELS, type AiProvider } from "@/lib/blog-ai-shared";

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
        "Bạn là biên tập viên cho khối 'Có thể bạn chưa biết' trên blog tiếng Việt. Mỗi mục là một sự thật thú vị, bất ngờ nhưng chính xác. Chỉ trả JSON hợp lệ, không giải thích.",
      user: `${
        topic ? `Chủ đề: "${topic}".` : "Tự chọn một chủ đề thú vị bất kỳ (thiên nhiên, vũ trụ, lịch sử, khoa học, ẩm thực, động vật…)."
      } Soạn 1 mục 'Có thể bạn chưa biết' song ngữ VI/EN.

Yêu cầu:
- title: ngắn, gợi tò mò (40-70 ký tự).
- intro: 1-2 câu súc tích giải thích sự thật đó.
- tag: 1 từ phân loại chủ đề (VD: Thiên nhiên, Vũ trụ, Lịch sử).
- images: ${count} ảnh minh họa — mỗi ảnh có "query" tiếng Anh 2-4 từ cụ thể, chụp được bằng máy ảnh; "caption_vi" và "caption_en" ngắn (<= 50 ký tự).

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
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI lỗi" }, { status: 500 });
  }
}
