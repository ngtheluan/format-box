import { isAdmin } from "@/lib/admin-auth";
import { listAdminCategories, listAdminPosts } from "@/lib/blog";
import { callLlm, parseJsonLoose } from "@/lib/blog-ai";
import { AI_MODELS, type AiProvider } from "@/lib/blog-ai-shared";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Suggest fresh topics for a category, avoiding titles the blog already has.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { category?: string; provider?: AiProvider; trending?: boolean };
  const provider: AiProvider = body.provider && body.provider in AI_MODELS ? body.provider : "groq";

  const [cats, posts] = await Promise.all([listAdminCategories(), listAdminPosts()]);
  const label = cats.find((c) => c.slug === body.category)?.label || body.category || "công nghệ";
  const today = new Date().toISOString().slice(0, 10);

  try {
    const r = await callLlm({
      provider,
      json: !body.trending,
      webSearch: !!body.trending,
      temperature: 0.9,
      timeoutMs: 90_000,
      system: "Bạn là biên tập viên trưởng của một blog tiếng Việt. Chỉ trả JSON hợp lệ, không giải thích.",
      user: `Hôm nay ${today}. ${
        body.trending ? "Tra cứu web các tin tức/xu hướng mới nhất rồi " : ""
      }đề xuất 6 chủ đề bài blog tiếng Việt cho danh mục "${label}": cụ thể, hữu ích, có góc nhìn riêng, tiêu đề 45–75 ký tự.
Tránh trùng các bài đã có:
${posts.slice(0, 50).map((p) => `- ${p.title}`).join("\n") || "(chưa có)"}

JSON: {"ideas":[{"title":"...","angle":"1 câu: bài sẽ giúp người đọc điều gì"}]}`,
    });
    const j = parseJsonLoose<{ ideas?: { title?: string; angle?: string }[] }>(r.text);
    const ideas = (j?.ideas || [])
      .filter((i) => i?.title)
      .slice(0, 8)
      .map((i) => ({ title: String(i.title).trim(), angle: String(i.angle || "").trim() }));
    if (!ideas.length) return NextResponse.json({ error: "AI không trả gợi ý hợp lệ" }, { status: 502 });
    return NextResponse.json({ ideas, provider: r.provider, searched: r.searched });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi" }, { status: 502 });
  }
}
