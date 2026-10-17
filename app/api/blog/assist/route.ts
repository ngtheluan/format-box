import { isAdmin } from "@/lib/admin-auth";
import { callLlm, parseJsonLoose } from "@/lib/blog-ai";
import { AI_MODELS, type AiProvider } from "@/lib/blog-ai-shared";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ACTIONS = {
  rewrite: "Viết lại đoạn sau cho hay hơn, rõ ý hơn, giữ nguyên ý nghĩa và dữ kiện.",
  expand: "Mở rộng đoạn sau sâu hơn (gấp khoảng 1.5–2 lần): thêm giải thích, ví dụ thực tế; không bịa số liệu.",
  shorten: "Rút gọn đoạn sau còn khoảng một nửa, giữ ý chính.",
  polish: "Sửa chính tả, ngữ pháp, câu chữ cho mượt và tự nhiên; thay đổi tối thiểu.",
} as const;

type Action = keyof typeof ACTIONS | "meta";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    action?: Action;
    text?: string;
    title?: string;
    provider?: AiProvider;
  };
  const provider: AiProvider = body.provider && body.provider in AI_MODELS ? body.provider : "groq";
  const text = (body.text || "").toString().slice(0, 16000);
  if (!text.trim()) return NextResponse.json({ error: "Thiếu nội dung" }, { status: 400 });

  try {
    if (body.action === "meta") {
      const r = await callLlm({
        provider,
        json: true,
        temperature: 0.6,
        timeoutMs: 60_000,
        system: "Bạn là biên tập viên SEO của blog tiếng Việt. Chỉ trả JSON hợp lệ.",
        user: `Dựa trên bài viết sau, đề xuất:\n- title 45–75 ký tự, hấp dẫn, trung thực\n- excerpt 120–180 ký tự\n- 4 tags ngắn\n\nJSON: {"title":"...","excerpt":"...","tags":["..."]}\n\nBÀI VIẾT:\n${text.slice(0, 9000)}`,
      });
      const j = parseJsonLoose(r.text);
      if (!j?.title) return NextResponse.json({ error: "AI không trả kết quả hợp lệ" }, { status: 502 });
      return NextResponse.json({ meta: j });
    }

    const action = (body.action && body.action in ACTIONS ? body.action : "rewrite") as keyof typeof ACTIONS;
    const r = await callLlm({
      provider,
      temperature: 0.6,
      timeoutMs: 90_000,
      system:
        "Bạn là biên tập viên blog tiếng Việt. Giữ nguyên định dạng Markdown (heading, list, code, link, ảnh). Chỉ trả về đoạn văn đã chỉnh, không giải thích, không bọc code fence.",
      user: `${ACTIONS[action]}${body.title ? `\nBài viết: "${body.title}"` : ""}\n\n---\n${text}`,
    });
    return NextResponse.json({ text: r.text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi" }, { status: 502 });
  }
}
