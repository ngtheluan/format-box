import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { groupPostsBySeries, listAdminPosts, parseSeriesFromPost } from "@/lib/blog";
import { callLlm, parseJsonLoose } from "@/lib/blog-ai";
import { AI_MODELS, type AiProvider } from "@/lib/blog-ai-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Suggestion = { title: string; slugs: string[]; reason?: string };

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { provider?: AiProvider };
  const provider: AiProvider = body.provider && body.provider in AI_MODELS ? body.provider : "groq";
  const model = provider === "groq" ? "openai/gpt-oss-120b" : AI_MODELS[provider][0]?.id;

  const all = await listAdminPosts();
  const existingSlugs = new Set<string>();
  for (const p of all) {
    const s = parseSeriesFromPost(p);
    if (s) existingSlugs.add(p.slug);
  }
  const existingGroups = groupPostsBySeries(all);
  const pool = all
    .filter((p) => p.status === "published" && !existingSlugs.has(p.slug))
    .slice(0, 120);

  if (pool.length < 2) {
    return NextResponse.json({ suggestions: [] as Suggestion[] });
  }

  const avoidLabels = existingGroups.map((g) => g.label).join(", ") || "(chưa có)";
  const corpus = pool.map((p) => `- [${p.slug}] (${p.category}) ${p.title}`).join("\n");

  try {
    const r = await callLlm({
      provider,
      model,
      json: true,
      temperature: 0.6,
      timeoutMs: 40_000,
      maxTokens: 1400,
      system:
        "Bạn là biên tập viên blog tiếng Việt chuyên nhóm bài thành series mạch lạc. Chỉ trả JSON hợp lệ, không giải thích thêm.",
      user: `Dưới đây là danh sách bài blog chưa thuộc series nào. Hãy đề xuất 3–6 series mới; mỗi series gom tối thiểu 3 bài có cùng chủ đề/mạch nội dung, đặt tiêu đề tiếng Việt ngắn gọn (4–8 chữ), nêu lý do nhóm trong 1 câu. Mỗi bài chỉ xuất hiện trong tối đa 1 series đề xuất. Chỉ dùng slug nằm trong danh sách.

Tránh trùng tên với các series đã có: ${avoidLabels}.

Danh sách bài:
${corpus}

JSON: {"suggestions":[{"title":"...","slugs":["slug-a","slug-b","slug-c"],"reason":"..."}]}`,
    });
    const j = parseJsonLoose<{ suggestions?: Suggestion[] }>(r.text);
    const bySlug = new Set(pool.map((p) => p.slug));
    const used = new Set<string>();
    const out: Suggestion[] = [];
    for (const s of j?.suggestions || []) {
      const title = String(s?.title || "").trim();
      const slugs = Array.isArray(s?.slugs) ? s.slugs.filter((x): x is string => typeof x === "string") : [];
      const picked = slugs.filter((x) => bySlug.has(x) && !used.has(x));
      if (!title || picked.length < 2) continue;
      picked.forEach((x) => used.add(x));
      out.push({ title, slugs: picked, reason: String(s?.reason || "").trim() || undefined });
      if (out.length >= 6) break;
    }
    if (!out.length) return NextResponse.json({ error: "AI không trả gợi ý hợp lệ" }, { status: 502 });
    return NextResponse.json({ suggestions: out, provider: r.provider });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi" }, { status: 502 });
  }
}
