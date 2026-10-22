import { isAdmin } from "@/lib/admin-auth";
import {
  getAdminPost,
  insertPost,
  listAdminCategories,
  listAdminPosts,
  slugify,
  withCoverCredit,
  wordCount,
  type BlogCategory,
  type BlogPost,
} from "@/lib/blog";
import { callLlm, imageCaption, parseJsonLoose, pickImages, researchTopic, toQuery, type ImageSlot } from "@/lib/blog-ai";
import {
  AI_MODELS,
  GEN_AUDIENCES,
  GEN_CTAS,
  GEN_EXTRAS,
  GEN_IMAGE_STYLES,
  GEN_LENGTHS,
  GEN_REGIONS,
  GEN_STRUCTURES,
  GEN_TONES,
  type AiProvider,
  type GenAudience,
  type GenCta,
  type GenEvent,
  type GenExtra,
  type GenImageStyle,
  type GenLength,
  type GenRegion,
  type GenStructure,
  type GenTone,
} from "@/lib/blog-ai-shared";
import { buildSystemPrompt, CATEGORY_STYLE } from "@/lib/blog-prompt";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = {
  mode?: "topic" | "random";
  topic?: string;
  category?: BlogCategory;
  provider?: AiProvider;
  model?: string;
  tone?: GenTone;
  length?: GenLength;
  images?: number;
  research?: boolean;
  notes?: string;
  audience?: GenAudience;
  structure?: GenStructure;
  seoKeyword?: string;
  extras?: GenExtra[];
  cta?: GenCta;
  region?: GenRegion;
  imageStyle?: GenImageStyle;
  factCheck?: boolean;
  internalLinks?: boolean;
};

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = ((await req.json().catch(() => null)) || {}) as Body;

  const provider: AiProvider = body.provider && body.provider in AI_MODELS ? body.provider : "groq";
  const model = AI_MODELS[provider].some((m) => m.id === body.model) ? body.model : undefined;
  const tone = GEN_TONES.find((t) => t.id === body.tone) || GEN_TONES[0];
  const length = GEN_LENGTHS.find((l) => l.id === body.length) || GEN_LENGTHS[1];
  const nImages = Math.max(0, Math.min(4, Number.isFinite(body.images) ? Number(body.images) : 3));
  const notes = (body.notes || "").toString().trim().slice(0, 1500);
  const audience = GEN_AUDIENCES.find((a) => a.id === body.audience) || GEN_AUDIENCES[1];
  const structure = GEN_STRUCTURES.find((s) => s.id === body.structure) || GEN_STRUCTURES[0];
  const seoKeyword = (body.seoKeyword || "").toString().trim().slice(0, 120);
  const extraIds = new Set((Array.isArray(body.extras) ? body.extras : []).filter((e) => GEN_EXTRAS.some((g) => g.id === e)));
  const extras = GEN_EXTRAS.filter((e) => extraIds.has(e.id));
  const cta = GEN_CTAS.find((c) => c.id === body.cta) || GEN_CTAS[0];
  const region = GEN_REGIONS.find((r) => r.id === body.region) || GEN_REGIONS[0];
  const imageStyle = GEN_IMAGE_STYLES.find((s) => s.id === body.imageStyle) || GEN_IMAGE_STYLES[2];
  const factCheck = !!body.factCheck;
  const internalLinks = !!body.internalLinks;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (e: GenEvent) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(JSON.stringify(e) + "\n")); } catch {}
      };
      // Heartbeat every 10s keeps the HTTP connection alive during long LLM calls
      // (fetch failed on proxy idle timeout is the usual culprit).
      const heartbeat = setInterval(() => send({ type: "ping" }), 10_000);
      try {
        const [cats, existing] = await Promise.all([listAdminCategories(), listAdminPosts()]);
        const validCats = cats.filter((c) => c.active).map((c) => c.slug);
        let category = body.category && validCats.includes(body.category) ? body.category : undefined;
        let topic = (body.topic || "").toString().trim();

        // 1) Random → let AI pick a fresh topic that the blog has not covered yet.
        if (body.mode === "random" || !topic) {
          send({ type: "step", step: "topic", status: "start" });
          category = category || validCats[Math.floor(Math.random() * validCats.length)] || "tech";
          const label = cats.find((c) => c.slug === category)?.label || category;
          const r = await callLlm({
            provider,
            model,
            json: true,
            temperature: 1,
            timeoutMs: 60_000,
            system: "Bạn là biên tập viên blog công nghệ & ẩm thực Việt Nam. Trả JSON hợp lệ.",
            user: `Đề xuất 1 chủ đề blog tiếng Việt hấp dẫn, có tính thời sự (hôm nay ${new Date()
              .toISOString()
              .slice(0, 10)}), thuộc danh mục "${label}". Không trùng các bài đã có:\n${existing
              .slice(0, 40)
              .map((p) => `- ${p.title}`)
              .join("\n")}\n\nJSON: {"topic":"...","angle":"góc tiếp cận 1 câu"}`,
          });
          const j = parseJsonLoose<{ topic?: string; angle?: string }>(r.text);
          topic = j?.topic?.trim() || `Xu hướng ${label} đáng chú ý`;
          if (j?.angle) topic += ` — ${j.angle}`;
          send({ type: "step", step: "topic", status: "done", detail: topic });
        }

        // 2) Optional web research for fresh, verifiable facts.
        let research = "";
        if (body.research) {
          send({ type: "step", step: "research", status: "start" });
          try {
            const r = await researchTopic(topic, { provider, model });
            research = r.notes;
            send({
              type: "step",
              step: "research",
              status: r.searched ? "done" : "skip",
              detail: r.searched ? `Đã tra cứu web (${r.provider})` : "Model không hỗ trợ tra cứu web",
            });
            if (!r.searched) research = "";
          } catch (e: any) {
            send({ type: "step", step: "research", status: "skip", detail: e?.message?.slice(0, 160) });
          }
        } else {
          send({ type: "step", step: "research", status: "skip" });
        }

        // 3) Write.
        send({ type: "step", step: "write", status: "start" });
        const label = category ? cats.find((c) => c.slug === category)?.label : null;
        const user = [
          `Chủ đề: ${topic}`,
          label ? `Danh mục bắt buộc: ${category} (${label})` : null,
          `Giọng văn: ${tone.label} — ${tone.hint}.`,
          `Độ dài: ${length.words} từ, ${length.sections} section chính.`,
          `Đối tượng đọc: ${audience.label} — ${audience.hint}.`,
          structure.id !== "auto" ? `Cấu trúc bài: ${structure.label} — ${structure.hint}.` : null,
          seoKeyword
            ? `Từ khoá SEO chính: "${seoKeyword}" — xuất hiện tự nhiên ở title, hook, ít nhất 2 heading con và 2–3 lần trong thân bài; không nhồi.`
            : null,
          `Vùng mục tiêu: ${region.label} — ${region.hint}.`,
          cta.id !== "none" ? `Call-to-action cuối bài (sau "## Kết luận"): ${cta.label} — ${cta.hint}. 1–2 câu, không hô khẩu hiệu.` : null,
          extras.length
            ? `Phần phụ bắt buộc:\n${extras
                .map((e) =>
                  e.id === "tldr"
                    ? "- Ngay sau đoạn hook, thêm block \"**Tóm tắt**\" với 3 gạch đầu dòng tóm tắt bài."
                    : e.id === "faq"
                      ? "- Trước \"## Kết luận\", thêm \"## Câu hỏi thường gặp\" với 4–6 cặp **Q:** / **A:** ngắn gọn."
                      : e.id === "stats"
                        ? "- Khi có ghi chú nghiên cứu, trích số liệu kèm năm hoặc nguồn ngay trong câu."
                        : "- Nếu chủ đề kỹ thuật, chèn 1–3 code block có cú pháp đúng và chú thích.",
                )
                .join("\n")}`
            : null,
          nImages > 0 ? `Số ảnh minh hoạ trong bài: đúng ${nImages}.` : "Không chèn ảnh minh hoạ trong bài.",
          notes ? `Yêu cầu thêm của biên tập: ${notes}` : null,
          research ? `\nGHI CHÚ NGHIÊN CỨU (đã tra cứu web):\n${research}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        const written = await callLlm({
          provider,
          model,
          system: buildSystemPrompt(cats.filter((c) => c.active)),
          user,
          temperature: 0.75,
          timeoutMs: 150_000,
          long: true,
        });
        send({ type: "step", step: "write", status: "done", detail: `${written.provider} · ${written.model}` });

        const trimmed = written.text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
        const metaMatch = trimmed.match(/META\s*=\s*(\{[^\n]*\})\s*\n/);
        if (!metaMatch) throw new Error("AI không trả dòng META hợp lệ — thử lại hoặc đổi model");
        const meta = parseJsonLoose<{
          title?: string;
          excerpt?: string;
          category?: string;
          tags?: string[];
          from?: string;
          to?: string;
          label?: string;
          imageQuery?: string;
          imagePrompt?: string;
        }>(metaMatch[1]);
        if (!meta?.title) throw new Error("META không parse được");
        let md = trimmed.slice((metaMatch.index ?? 0) + metaMatch[0].length).trim().replace(/^#\s+.+\n+/, "");
        if (md.length < 400) throw new Error("Nội dung bài quá ngắn");

        const finalCat =
          category || (meta.category && validCats.includes(meta.category) ? meta.category : validCats[0] || "tech");

        let slug = slugify(meta.title) || slugify(topic);
        for (let i = 2; await getAdminPost(slug); i++) slug = `${slugify(meta.title)}-${i}`;

        // 4a) Fact-check pass: a second model reviews the draft for likely hallucinations.
        if (factCheck) {
          send({ type: "step", step: "factcheck", status: "start" });
          try {
            const check = await callLlm({
              provider: written.provider === "pollinations" ? provider : written.provider,
              json: true,
              temperature: 0,
              timeoutMs: 60_000,
              system:
                "You are a strict fact-checker for Vietnamese blog articles. Spot claims that look fabricated: made-up numbers, versions, dates, quotes, product names, prices, benchmarks. Reply JSON only.",
              user: `Bài:\n${md.slice(0, 6000)}\n\nTrả JSON {"issues": ["..."], "fixed": "bản markdown đã bỏ/làm mềm các câu bịa, giữ nguyên các phần khác, KHÔNG rút ngắn tuỳ ý"}.\nNếu không có vấn đề, trả {"issues":[],"fixed":""}.`,
            });
            const j = parseJsonLoose<{ issues?: string[]; fixed?: string }>(check.text);
            const issues = j?.issues?.length || 0;
            if (j?.fixed && j.fixed.length > 400) md = j.fixed.trim();
            send({ type: "step", step: "factcheck", status: "done", detail: issues ? `Sửa ${issues} điểm nghi vấn` : "Không có cảnh báo" });
          } catch (e: any) {
            send({ type: "step", step: "factcheck", status: "skip", detail: e?.message?.slice(0, 120) });
          }
        } else {
          send({ type: "step", step: "factcheck", status: "skip" });
        }

        // 4b) Internal-links pass: inject links to related published posts at the end.
        if (internalLinks && existing.length) {
          send({ type: "step", step: "linking", status: "start" });
          try {
            const published = existing.filter((p) => (p.status || "published") === "published").slice(0, 24);
            if (published.length) {
              const listing = published.map((p) => `- /blog/${p.slug} | ${p.title}`).join("\n");
              const r = await callLlm({
                provider: written.provider === "pollinations" ? provider : written.provider,
                json: true,
                temperature: 0.2,
                timeoutMs: 45_000,
                system: "Bạn chọn 2–4 bài liên quan nhất về chủ đề cho người đọc. Trả JSON thuần.",
                user: `Bài vừa viết: "${meta.title}"\nExcerpt: ${meta.excerpt || ""}\n\nDanh sách bài đã xuất bản:\n${listing}\n\nTrả JSON {"related": [{"slug":"...","title":"..."}]} — 2–4 bài liên quan nhất, không trùng chủ đề hiện tại.`,
              });
              const j = parseJsonLoose<{ related?: { slug: string; title: string }[] }>(r.text);
              const related = (j?.related || []).filter((x) => published.some((p) => p.slug === x.slug)).slice(0, 4);
              if (related.length) {
                const block = `\n\n## Đọc thêm\n${related.map((x) => `- [${x.title}](/blog/${x.slug})`).join("\n")}\n`;
                // Insert before CTA block if present, else at end.
                md += block;
                send({ type: "step", step: "linking", status: "done", detail: `${related.length} bài liên quan` });
              } else {
                send({ type: "step", step: "linking", status: "skip", detail: "Không tìm được bài phù hợp" });
              }
            } else {
              send({ type: "step", step: "linking", status: "skip", detail: "Chưa có bài đã xuất bản" });
            }
          } catch (e: any) {
            send({ type: "step", step: "linking", status: "skip", detail: e?.message?.slice(0, 120) });
          }
        } else {
          send({ type: "step", step: "linking", status: "skip" });
        }

        // 5) Images: search real photos and let AI reject ones that don't match.
        const slots: ImageSlot[] = [];
        const imgRe = /!\[([^\]]*)\]\(IMG::([^)]+)\)/g;
        const sectionAt = (offset: number) => md.slice(0, offset).match(/##\s+(.+)\n/g)?.pop()?.replace(/^##\s+/, "") || "";
        let m: RegExpExecArray | null;
        let n = 0;
        while ((m = imgRe.exec(md))) {
          if (n >= Math.max(nImages, 0)) break;
          slots.push({ key: `img${++n}`, alt: m[1], query: toQuery(m[2], 6), context: sectionAt(m.index) });
        }
        const styleSuffix = imageStyle.id === "illustration" ? " illustration vector" : imageStyle.id === "photo" ? " photo" : "";
        const coverQuery = toQuery((meta.imageQuery || meta.imagePrompt || meta.title) + styleSuffix, 6);
        slots.unshift({ key: "cover", alt: meta.title, query: coverQuery, context: meta.excerpt || meta.title });
        if (styleSuffix) slots.forEach((s) => (s.query = s.key === "cover" ? s.query : toQuery(s.query + styleSuffix, 6)));

        send({ type: "step", step: "images", status: "start", detail: `${slots.length} ảnh` });
        const picked = await pickImages(slots, { title: meta.title, provider: written.provider });
        let k = 0;
        md = md.replace(/!\[([^\]]*)\]\(IMG::([^)]+)\)\n?/g, (_all, alt) => {
          const c = picked[`img${++k}`];
          return c ? `![${alt}](${c.url})\n${imageCaption(c)}\n` : "";
        });
        md = md.replace(/\n{3,}/g, "\n\n");
        const found = Object.values(picked).filter(Boolean).length;
        send({ type: "step", step: "images", status: "done", detail: `${found}/${slots.length} ảnh phù hợp` });

        // 5) Save as draft.
        send({ type: "step", step: "save", status: "start" });
        const fallback = CATEGORY_STYLE[finalCat]?.colors || ["#7565F6", "#22C5E8"];
        const hex = (s?: string) => (s && /^#[0-9a-f]{6}$/i.test(s) ? s : null);
        const cover = picked.cover;
        const post: BlogPost = {
          slug,
          title: meta.title.trim(),
          excerpt: (meta.excerpt || "").trim(),
          category: finalCat,
          tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 6).map(String) : [],
          author: "Admin",
          date: new Date().toISOString().slice(0, 10),
          readMin: Math.max(3, Math.min(30, Math.round(wordCount(md) / 220))),
          cover: {
            from: hex(meta.from) || fallback[0],
            to: hex(meta.to) || fallback[1],
            label: meta.label || meta.title.split(/\s+/)[0],
          },
          coverImage: cover
            ? withCoverCredit(cover.url, {
                name: cover.credit,
                url: cover.creditUrl,
                source: cover.source === "unsplash" ? "Unsplash" : cover.license || "Openverse",
              })
            : undefined,
          status: "draft",
        };
        await insertPost(post, md);
        send({ type: "step", step: "save", status: "done" });
        send({ type: "done", post });
      } catch (e: any) {
        send({ type: "error", error: e?.message || "Lỗi không xác định" });
      } finally {
        clearInterval(heartbeat);
        closed = true;
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
