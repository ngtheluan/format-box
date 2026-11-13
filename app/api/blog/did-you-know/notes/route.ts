import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { listAdminDidYouKnow, updateDidYouKnow, type DidYouKnowImage } from "@/lib/blog";
import { callLlm, parseJsonLoose } from "@/lib/blog-ai";
import { AI_MODELS, type AiProvider } from "@/lib/blog-ai-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

type Notes = { notes?: { vi?: string; en?: string }[] };

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { slug?: string; provider?: AiProvider };
  const slug = (body.slug || "").trim();
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  const provider: AiProvider = body.provider && body.provider in AI_MODELS ? body.provider : "groq";

  try {
    const item = (await listAdminDidYouKnow()).find((it) => it.slug === slug);
    if (!item) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    if (!item.images.length) return NextResponse.json({ error: "Mục chưa có ảnh" }, { status: 400 });

    const imgList = item.images
      .map((im, i) => `#${i} caption_vi: "${im.caption_vi || ""}" | url: ${im.url}`)
      .join("\n");

    const r = await callLlm({
      provider,
      json: true,
      temperature: 0.7,
      timeoutMs: 45_000,
      maxTokens: 300 + item.images.length * 220,
      system:
        "Bạn là giám tuyển một bảo tàng số 'Có thể bạn chưa biết'. Soạn ghi chú giám tuyển song ngữ VI/EN cho từng ảnh của một hiện vật, bám sát điều ảnh minh họa và chủ đề chung, không lặp lại intro. Chỉ trả JSON hợp lệ.",
      user: `Hiện vật:
- Chủ đề: ${item.tag_vi || "(không ghi)"}
- Tiêu đề: ${item.title_vi}
- Intro (ĐỪNG lặp lại nguyên văn): ${item.intro_vi}

Các ảnh:
${imgList}

Soạn đúng ${item.images.length} ghi chú theo đúng thứ tự ảnh ở trên. Mỗi ghi chú:
- 1-2 câu, <= 180 ký tự mỗi ngôn ngữ.
- Nói về điều ảnh này cho thấy (chi tiết trong ảnh + liên hệ chủ đề).
- Mở đầu bằng cụm từ KHÁC các ghi chú khác trong danh sách (vd: "Trong khung hình này…", "Đáng chú ý…", "Ít ai để ý…", "Nhìn kỹ hơn…", "Cạnh đó…") — mỗi ảnh một giọng khác, không trùng, không lặp intro.
- Chỉ dùng dữ kiện chắc chắn, không bịa tên riêng/năm tháng.

JSON: {"notes":[{"vi":"...","en":"..."}]}`,
    });

    const j = parseJsonLoose<Notes>(r.text);
    const notes = Array.isArray(j?.notes) ? j!.notes! : [];
    if (notes.length < item.images.length) {
      return NextResponse.json({ error: `AI trả về ${notes.length}/${item.images.length} ghi chú` }, { status: 502 });
    }

    const nextImages: DidYouKnowImage[] = item.images.map((im, i) => {
      const n = notes[i] || {};
      const note_vi = (n.vi || "").trim();
      const note_en = (n.en || n.vi || "").trim();
      const { note_vi: _nv, note_en: _ne, ...rest } = im;
      return {
        ...rest,
        ...(note_vi ? { note_vi } : {}),
        ...(note_en ? { note_en } : {}),
      };
    });

    await updateDidYouKnow(slug, { images: nextImages });
    return NextResponse.json({ ok: true, images: nextImages });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI lỗi" }, { status: 500 });
  }
}
