import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { listAdminDidYouKnow, updateDidYouKnow } from "@/lib/blog";
import { AI_MODELS, type AiProvider } from "@/lib/blog-ai-shared";
import { generateDykQuiz } from "@/lib/dyk-quiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { slug?: string; provider?: AiProvider };
  const slug = (body.slug || "").trim();
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  const provider: AiProvider = body.provider && body.provider in AI_MODELS ? body.provider : "groq";

  try {
    const item = (await listAdminDidYouKnow()).find((it) => it.slug === slug);
    if (!item) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const quiz = await generateDykQuiz(item, provider);
    await updateDidYouKnow(slug, { quiz });
    return NextResponse.json({ ok: true, count: quiz.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI lỗi" }, { status: 500 });
  }
}
