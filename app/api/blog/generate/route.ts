import { isCronRequest, isSuperAdmin } from "@/lib/admin-auth";
import {
  getAdminPost,
  insertPost,
  listAdminCategories,
  listAdminPosts,
  slugify,
  updatePost,
  withCoverCredit,
  wordCount,
  type BlogCategory,
  type BlogPost,
} from "@/lib/blog";
import {
  callLlm,
  findYouTubeVideo,
  imageCaption,
  isAsciiQuery,
  parseJsonLoose,
  pickImages,
  researchTopic,
  toQuery,
  translatePhotoQueriesBatch,
  type ImageSlot,
} from "@/lib/blog-ai";
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
// Auto runs arrive with no cookies; without this the existing-post list used to
// avoid duplicate topics, and identical LLM calls, can come from Next's Data Cache.
export const fetchCache = "force-no-store";
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
  includeVideo?: boolean;
  relatedTools?: string[];
};

export async function POST(req: Request) {
  if (!isCronRequest(req) && !(await isSuperAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = ((await req.json().catch(() => null)) || {}) as Body;

  const provider: AiProvider = body.provider && body.provider in AI_MODELS ? body.provider : "groq";
  const model = AI_MODELS[provider].some((m) => m.id === body.model) ? body.model : undefined;
  const tone = GEN_TONES.find((t) => t.id === body.tone) || GEN_TONES[0];
  const length = GEN_LENGTHS.find((l) => l.id === body.length) || GEN_LENGTHS[1];
  const nImages = Math.max(0, Math.min(10, Number.isFinite(body.images) ? Number(body.images) : 4));
  const notes = (body.notes || "").toString().trim().slice(0, 1500);
  const audience = GEN_AUDIENCES.find((a) => a.id === body.audience) || GEN_AUDIENCES[1];
  const structure = GEN_STRUCTURES.find((s) => s.id === body.structure) || GEN_STRUCTURES[0];
  const seoKeyword = (body.seoKeyword || "").toString().trim().slice(0, 120);
  const extraIds = new Set(
    (Array.isArray(body.extras) ? body.extras : []).filter((e) => GEN_EXTRAS.some((g) => g.id === e)),
  );
  const extras = GEN_EXTRAS.filter((e) => extraIds.has(e.id));
  const cta = GEN_CTAS.find((c) => c.id === body.cta) || GEN_CTAS[0];
  const region = GEN_REGIONS.find((r) => r.id === body.region) || GEN_REGIONS[0];
  const imageStyle = GEN_IMAGE_STYLES.find((s) => s.id === body.imageStyle) || GEN_IMAGE_STYLES[2];
  const factCheck = !!body.factCheck;
  const internalLinks = !!body.internalLinks;
  const includeVideo = !!body.includeVideo;
  const relatedTools = Array.isArray(body.relatedTools)
    ? body.relatedTools.map((h) => String(h)).slice(0, 6)
    : [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (e: GenEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {}
      };
      // Heartbeat every 10s keeps the HTTP connection alive during long LLM calls
      // (fetch failed on proxy idle timeout is the usual culprit).
      const heartbeat = setInterval(() => send({ type: "ping" }), 10_000);
      try {
        const [cats, existing] = await Promise.all([listAdminCategories(), listAdminPosts()]);
        const validCats = cats.filter((c) => c.active).map((c) => c.slug);
        let category = body.category && validCats.includes(body.category) ? body.category : undefined;
        let topic = (body.topic || "").toString().trim();

        // Shared across random-pick and the user-typed-topic guard: a cheap
        // token-overlap similarity against existing titles to block duplicates.
        const normalize = (s: string) =>
          s
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/đ/gi, "d")
            .toLowerCase();
        const STOP = new Set([
          "cua","va","la","mot","nhung","nay","do","voi","cho","trong","tren","duoi","ve","de",
          "khong","co","khi","nhu","tu","da","dang","se","hay","hoac","thi","cung","neu","nen",
          "ma","boi","the","cac","nao","moi","nhat","them","giup","ban","the","nguoi","viet",
          "the","gi","ra","len","xuong","o","di","vi","sao","toi","chung","ta","minh","the",
          "bai","blog","huong","dan","cach",
        ]);
        const tokenize = (s: string): Set<string> =>
          new Set(
            normalize(s)
              .split(/[^a-z0-9]+/)
              .filter((w) => w.length >= 3 && !STOP.has(w)),
          );
        const similarity = (a: string, b: string): number => {
          const A = tokenize(a);
          const B = tokenize(b);
          if (A.size < 2 || B.size < 2) return 0;
          let inter = 0;
          for (const x of A) if (B.has(x)) inter++;
          return inter / Math.min(A.size, B.size);
        };
        // Match against every stored title (not just same category): user's rule
        // is "liên quan bài viết trước đó" regardless of category.
        const existingTitles = existing.map((p) => p.title);
        const findClosest = (candidate: string, threshold: number) => {
          let best: { title: string; score: number } | null = null;
          for (const t of existingTitles) {
            const s = similarity(candidate, t);
            if (!best || s > best.score) best = { title: t, score: s };
          }
          return best && best.score >= threshold ? best : null;
        };

        // 1) Random → let AI pick a fresh topic that the blog has not covered yet.
        if (body.mode === "random" || !topic) {
          send({ type: "step", step: "topic", status: "start" });
          category = category || validCats[Math.floor(Math.random() * validCats.length)] || "tech";
          const label = cats.find((c) => c.slug === category)?.label || category;
          // Count how often each brand/entity appears in recent titles for this
          // category. Without this the LLM keeps proposing the same trending
          // brand (Apple, iPhone…) on every tick.
          const sameCat = existing.filter((p) => p.category === category);
          const recentTitles = sameCat.slice(0, 80).map((p) => p.title);
          const BRAND_RE = /\b(Apple|iPhone|iPad|iOS|MacBook|Mac|AirPods|Vision Pro|Samsung|Galaxy|Google|Pixel|Android|Microsoft|Windows|Xbox|Meta|Facebook|Instagram|WhatsApp|OpenAI|ChatGPT|GPT|Claude|Anthropic|Gemini|DeepSeek|Grok|Nvidia|AMD|Intel|Qualcomm|Tesla|SpaceX|TikTok|ByteDance|Xiaomi|Huawei|Sony|Netflix|Amazon|AWS|Oracle|IBM|Spotify|Adobe|Figma|GitHub|Vercel|Next\.js|React|Vue|Angular|Node|Python|Rust|Go|Java|Swift|Kotlin|Linux|Ubuntu|Docker|Kubernetes|PostgreSQL|MongoDB|Redis|Supabase|Firebase|Cloudflare)\b/gi;
          const brandCount = new Map<string, number>();
          for (const t of recentTitles) {
            const seen = new Set<string>();
            for (const m of t.matchAll(BRAND_RE)) {
              const key = m[0].toLowerCase();
              if (seen.has(key)) continue;
              seen.add(key);
              brandCount.set(key, (brandCount.get(key) || 0) + 1);
            }
          }
          const overused = [...brandCount.entries()]
            .filter(([, n]) => n >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([k]) => k);
          const angles = [
            "xu hướng mới nổi",
            "so sánh đối thủ",
            "mẹo/thủ thuật thực hành",
            "câu chuyện doanh nghiệp/startup",
            "nghiên cứu, báo cáo mới",
            "góc nhìn phản biện",
            "hướng dẫn cho người mới",
            "sự kiện/thông báo trong tuần",
          ];
          const pickedAngle = angles[Math.floor(Math.random() * angles.length)];
          // Retry up to 3 times if the proposed topic is too close to any
          // existing title. Each retry adds the collided title to the ban list.
          const dupBan: string[] = [];
          let picked = "";
          let pickedCandidate: { topic: string; angle?: string } | null = null;
          let collision: { title: string; score: number } | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const r = await callLlm({
              provider,
              model,
              json: true,
              temperature: 1,
              timeoutMs: 60_000,
              system: "Bạn là biên tập viên blog công nghệ & ẩm thực Việt Nam. Trả JSON hợp lệ.",
              user: [
                `Đề xuất 1 chủ đề blog tiếng Việt hấp dẫn, có tính thời sự (hôm nay ${new Date().toISOString().slice(0, 10)}), thuộc danh mục "${label}".`,
                `Yêu cầu đa dạng: hướng tiếp cận lần này là "${pickedAngle}".`,
                overused.length
                  ? `TUYỆT ĐỐI KHÔNG viết về các thương hiệu/chủ thể đã bị khai thác quá nhiều gần đây: ${overused.join(", ")}. Chọn thương hiệu/chủ thể KHÁC HẲN (ví dụ nếu bị cấm Apple thì chuyển sang Android, open-source, AI model mới, startup Việt, công nghệ phần cứng khác…).`
                  : "",
              "Không được lặp lại chủ thể chính của các bài đã có. Chủ đề mới phải khác hẳn về đối tượng, ngóc ngách, công nghệ — không chỉ khác tiêu đề.",
                dupBan.length
                  ? `Các gợi ý trước BỊ TỪ CHỐI vì quá giống bài đã có, TUYỆT ĐỐI không được chọn chủ thể tương tự: ${dupBan.join(" | ")}.`
                  : "",
                `Danh sách bài đã có (không được trùng tiêu đề hay chủ thể chính, kể cả khác câu chữ):\n${existingTitles
                  .slice(0, 120)
                  .map((t) => `- ${t}`)
                  .join("\n")}`,
                `JSON: {"topic":"...","angle":"góc tiếp cận 1 câu"}`,
              ]
                .filter(Boolean)
                .join("\n\n"),
            });
            const j = parseJsonLoose<{ topic?: string; angle?: string }>(r.text);
            const cand = j?.topic?.trim() || "";
            if (!cand) continue;
            const hit = findClosest(cand, 0.6);
            if (hit) {
              dupBan.push(`"${cand}" (giống "${hit.title}")`);
              collision = hit;
              send({
                type: "step",
                step: "topic",
                status: "start",
                detail: `Bỏ "${cand}" vì trùng "${hit.title}", chọn chủ đề khác…`,
              });
              continue;
            }
            picked = cand;
            pickedCandidate = { topic: cand, angle: j?.angle };
            collision = null;
            break;
          }
          if (!picked) {
            // All attempts collided — stop before wasting a long write pass on
            // a duplicate.
            const err = `Không tìm được chủ đề mới (trùng ${collision?.title ?? "bài cũ"}). Hãy nhập chủ đề hoặc đợi/thêm danh mục khác.`;
            send({ type: "error", error: err });
            send({ type: "step", step: "topic", status: "skip", detail: err });
            return;
          }
          topic = picked;
          if (pickedCandidate?.angle) topic += ` — ${pickedCandidate.angle}`;
          send({ type: "step", step: "topic", status: "done", detail: topic });
        } else {
          // User-typed topic: still refuse exact duplicates / near-duplicates
          // so the config path can't accidentally regenerate an existing post.
          const hit = findClosest(topic, 0.75);
          if (hit) {
            const err = `Chủ đề "${topic}" trùng bài đã có: "${hit.title}". Hãy sửa chủ đề hoặc xoá/ẩn bài cũ trước.`;
            send({ type: "error", error: err });
            return;
          }
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
          cta.id !== "none"
            ? `Call-to-action cuối bài (sau "## Kết luận"): ${cta.label} — ${cta.hint}. 1–2 câu, không hô khẩu hiệu.`
            : null,
          extras.length
            ? `Phần phụ bắt buộc:\n${extras
                .map((e) => {
                  switch (e.id) {
                    case "tldr":
                      return '- Ngay sau đoạn hook, thêm block "**Tóm tắt**" với 3 gạch đầu dòng tóm tắt bài.';
                    case "faq":
                      return '- Trước "## Kết luận", thêm "## Câu hỏi thường gặp" với 4–6 cặp **Q:** / **A:** ngắn gọn.';
                    case "stats":
                      return "- Khi có ghi chú nghiên cứu, trích số liệu kèm năm hoặc nguồn ngay trong câu.";
                    case "code":
                      return "- Nếu chủ đề kỹ thuật, chèn 1–3 code block có cú pháp đúng và chú thích.";
                    case "takeaway":
                      return '- Trước "## Kết luận", thêm block "**Điểm chốt (Key takeaways)**" với 3–5 gạch đầu dòng ngắn, mỗi dòng là một ý giá trị cao nhất rút ra được.';
                    case "example":
                      return "- Mỗi section ## chính có ít nhất 1 ví dụ thực tế, cụ thể (tên công cụ, tình huống, con số); không viết chung chung.";
                    case "checklist":
                      return '- Trước "## Kết luận", thêm "## Checklist hành động" dạng `- [ ] ...` với 4–7 việc người đọc có thể làm ngay sau khi đọc.';
                    case "quote":
                      return "- Chèn 1–2 blockquote `>` trích lời chuyên gia hoặc nguồn uy tín, kèm tên người/nguồn ở dòng dưới. Chỉ dùng câu nói có thể kiểm chứng, không bịa.";
                    case "warning":
                      return "- Có ít nhất 1 callout dạng `> ⚠️ **Lưu ý:** ...` cảnh báo lỗi phổ biến, cạm bẫy hoặc điểm người đọc hay bỏ sót.";
                    case "glossary":
                      return '- Trước "## Kết luận", thêm "## Thuật ngữ" định nghĩa 3–6 từ chuyên môn xuất hiện trong bài theo dạng **Term** — nghĩa ngắn 1 câu.';
                    default:
                      return "";
                  }
                })
                .filter(Boolean)
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

        const trimmed = written.text
          .replace(/^```[a-z]*\s*/i, "")
          .replace(/```\s*$/, "")
          .trim();
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
        const metaTitle = meta.title;
        let md = trimmed
          .slice((metaMatch.index ?? 0) + metaMatch[0].length)
          .trim()
          .replace(/^#\s+.+\n+/, "");
        if (md.length < 400) throw new Error("Nội dung bài quá ngắn");

        const finalCat =
          category || (meta.category && validCats.includes(meta.category) ? meta.category : validCats[0] || "tech");

        let slug = slugify(meta.title) || slugify(topic);
        for (let i = 2; await getAdminPost(slug); i++) slug = `${slugify(meta.title)}-${i}`;

        // 4) Fact-check, internal-links, AND the image pipeline all run in parallel.
        //    Factcheck/linking only read the draft; the image pipeline only needs the
        //    IMG:: slots + meta, both already extracted. Overlapping these three saves
        //    ~30-60s on a typical run (previously sequential: factcheck+linking → images).
        const canFact = factCheck;
        const canLink = internalLinks && existing.some((p) => (p.status || "published") === "published");
        if (canFact) send({ type: "step", step: "factcheck", status: "start" });
        if (canLink) send({ type: "step", step: "linking", status: "start" });

        const factP: Promise<string | null> = canFact
          ? callLlm({
              provider: written.provider === "pollinations" ? provider : written.provider,
              json: true,
              temperature: 0,
              timeoutMs: 60_000,
              system:
                "You are a strict fact-checker for Vietnamese blog articles. Spot claims that look fabricated: made-up numbers, versions, dates, quotes, product names, prices, benchmarks. Reply JSON only. CRITICAL: preserve every `![...](IMG::...)` placeholder exactly as it appears — do not remove, reorder, rename, or rewrite them; they are replaced with real images in a later step.",
              user: `Bài:\n${md.slice(0, 6000)}\n\nTrả JSON {"issues": ["..."], "fixed": "bản markdown đã bỏ/làm mềm các câu bịa, giữ nguyên các phần khác, KHÔNG rút ngắn tuỳ ý"}.\nNếu không có vấn đề, trả {"issues":[],"fixed":""}.`,
            })
              .then((check) => {
                const j = parseJsonLoose<{ issues?: string[]; fixed?: string }>(check.text);
                const issues = j?.issues?.length || 0;
                send({
                  type: "step",
                  step: "factcheck",
                  status: "done",
                  detail: issues ? `Sửa ${issues} điểm nghi vấn` : "Không có cảnh báo",
                });
                return j?.fixed && j.fixed.length > 400 ? j.fixed.trim() : null;
              })
              .catch((e: any) => {
                send({ type: "step", step: "factcheck", status: "skip", detail: e?.message?.slice(0, 120) });
                return null;
              })
          : (send({
              type: "step",
              step: "factcheck",
              status: "skip",
              detail: "Tắt — bật trong Nâng cao",
            }),
            Promise.resolve(null));

        const linkP: Promise<string | null> = canLink
          ? (() => {
              const published = existing.filter((p) => (p.status || "published") === "published").slice(0, 24);
              const listing = published.map((p) => `- /blog/${p.slug} | ${p.title}`).join("\n");
              return callLlm({
                provider: written.provider === "pollinations" ? provider : written.provider,
                json: true,
                temperature: 0.2,
                timeoutMs: 45_000,
                system: "Bạn chọn 2–4 bài liên quan nhất về chủ đề cho người đọc. Trả JSON thuần.",
                user: `Bài vừa viết: "${meta.title}"\nExcerpt: ${meta.excerpt || ""}\n\nDanh sách bài đã xuất bản:\n${listing}\n\nTrả JSON {"related": [{"slug":"...","title":"..."}]} — 2–4 bài liên quan nhất, không trùng chủ đề hiện tại.`,
              })
                .then((r) => {
                  const j = parseJsonLoose<{ related?: { slug: string; title: string }[] }>(r.text);
                  const related = (j?.related || [])
                    .filter((x) => published.some((p) => p.slug === x.slug))
                    .slice(0, 4);
                  if (related.length) {
                    send({ type: "step", step: "linking", status: "done", detail: `${related.length} bài liên quan` });
                    return `\n\n## Đọc thêm\n${related.map((x) => `- [${x.title}](/blog/${x.slug})`).join("\n")}\n`;
                  }
                  send({ type: "step", step: "linking", status: "skip", detail: "Không tìm được bài phù hợp" });
                  return null;
                })
                .catch((e: any) => {
                  send({ type: "step", step: "linking", status: "skip", detail: e?.message?.slice(0, 120) });
                  return null;
                });
            })()
          : (send({
              type: "step",
              step: "linking",
              status: "skip",
              detail: internalLinks ? "Chưa có bài đã xuất bản" : undefined,
            }),
            Promise.resolve(null));

        // Extract image slots from the original draft BEFORE factcheck can rewrite it.
        // Factcheck should preserve `![](IMG::...)` placeholders; if it drops some,
        // the corresponding picked image is just unused.
        const slots: ImageSlot[] = [];
        const imgRe = /!\[([^\]]*)\]\(IMG::([^)]+)\)/g;
        const sectionAt = (src: string, offset: number) =>
          src
            .slice(0, offset)
            .match(/##\s+(.+)\n/g)
            ?.pop()
            ?.replace(/^##\s+/, "") || "";
        let m: RegExpExecArray | null;
        let n = 0;
        while ((m = imgRe.exec(md))) {
          if (n >= Math.max(nImages, 0)) break;
          slots.push({ key: `img${++n}`, alt: m[1], query: m[2].trim(), context: sectionAt(md, m.index) });
        }
        const styleSuffix =
          imageStyle.id === "illustration" ? " illustration vector" : imageStyle.id === "photo" ? " photo" : "";
        const rawCover = (meta.imageQuery || meta.imagePrompt || "").toString().trim();
        slots.unshift({ key: "cover", alt: meta.title, query: rawCover, context: meta.excerpt || meta.title });

        const writerProvider = written.provider;
        send({
          type: "step",
          step: "images",
          status: "start",
          detail: nImages > 0 ? `${nImages} ảnh + ảnh bìa` : "Chỉ ảnh bìa",
        });

        // Image pipeline (translate → search → LLM pick) runs concurrently with
        // factcheck + linking. No shared mutable state until the join below.
        const imagesP = (async () => {
          const translated = await translatePhotoQueriesBatch(
            slots.map((s) => ({ key: s.key, query: s.query || s.alt || metaTitle, alt: s.alt, context: s.context })),
            { title: metaTitle, provider: writerProvider },
          );
          for (const s of slots) {
            if (!isAsciiQuery(s.query) && translated[s.key]) s.query = translated[s.key];
            if (!isAsciiQuery(s.query)) {
              const asciiTags = (Array.isArray(meta.tags) ? meta.tags : [])
                .map(String)
                .filter((t) => isAsciiQuery(t))
                .slice(0, 3)
                .join(" ");
              s.query =
                asciiTags ||
                metaTitle.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").split(/\s+/).slice(0, 4).join(" ");
            }
            s.query = toQuery(s.query + styleSuffix, 6);
          }
          return pickImages(slots, { title: metaTitle, provider: writerProvider });
        })();

        // Video pipeline (optional): search YouTube for a real, related video and
        // insert `@youtube[ID]` right after the hook. Runs in parallel with the
        // image + factcheck + linking stages.
        if (includeVideo) send({ type: "step", step: "video", status: "start" });
        const videoP: Promise<{ id: string; title: string } | null> = includeVideo
          ? (async () => {
              const seoBit = seoKeyword ? ` ${seoKeyword}` : "";
              const q = `${metaTitle}${seoBit}`.trim();
              const v = await findYouTubeVideo(q, { timeoutMs: 12_000 });
              send({
                type: "step",
                step: "video",
                status: v ? "done" : "skip",
                detail: v ? `${v.title}${v.channel ? ` · ${v.channel}` : ""}` : "Không tìm thấy video phù hợp",
              });
              return v;
            })().catch((e: any) => {
              send({ type: "step", step: "video", status: "skip", detail: e?.message?.slice(0, 120) });
              return null;
            })
          : Promise.resolve(null);

        const [fixed, linkBlock, picked, video] = await Promise.all([factP, linkP, imagesP, videoP]);
        if (fixed) md = fixed;
        if (linkBlock) md += linkBlock;
        if (video) {
          const embed = `\n\n@youtube[${video.id}]\n\n`;
          const firstH2 = md.search(/^##\s+/m);
          md = firstH2 >= 0 ? md.slice(0, firstH2) + embed + md.slice(firstH2) : md + embed;
        }

        let k = 0;
        md = md.replace(/!\[([^\]]*)\]\(IMG::([^)]+)\)\n?/g, (_all, alt) => {
          const c = picked[`img${++k}`];
          return c ? `![${alt}](${c.url})\n${imageCaption(c)}\n` : "";
        });
        md = md.replace(/\n{3,}/g, "\n\n");
        const found = Object.values(picked).filter(Boolean).length;
        send({
          type: "step",
          step: "images",
          status: "done",
          detail: `${found}/${slots.length} ảnh phù hợp (${nImages} ảnh + ảnh bìa)`,
        });

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
        if (relatedTools.length) {
          try {
            await updatePost(slug, { related_tools: relatedTools });
            post.relatedTools = relatedTools;
          } catch {
            // Older schemas may lack the related_tools column; ignore silently.
          }
        }
        send({ type: "step", step: "save", status: "done" });
        send({ type: "done", post });
      } catch (e: any) {
        send({ type: "error", error: e?.message || "Lỗi không xác định" });
      } finally {
        clearInterval(heartbeat);
        closed = true;
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
