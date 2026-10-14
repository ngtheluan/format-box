import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { insertPost, slugify, type BlogPost, type BlogCategory } from "@/lib/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Bạn là biên tập viên blog công nghệ tiếng Việt. Viết một bài blog chất lượng cao từ chủ đề người dùng cung cấp.

Trả về CHÍNH XÁC theo mẫu — không giải thích, không bọc markdown fence:

META={"title":"<tiêu đề>","excerpt":"<tóm tắt 1-2 câu>","category":"<tech|ai|web|mobile|devops>","tags":["<tag1>","<tag2>","<tag3>","<tag4>"],"readMin":<6-14>,"from":"<#hex>","to":"<#hex>","label":"<1-2 từ>","imagePrompt":"<prompt tiếng Anh mô tả ảnh bìa, digital art, minimalist, 20-30 từ, không chèn text/typography>"}

<nội dung bài viết — ĐỊNH DẠNG MARKDOWN>

QUY ĐỊNH NỘI DUNG MARKDOWN:
- Dòng đầu: 1 đoạn giới thiệu hook người đọc (không có heading).
- 6-8 section lớn, mỗi section bắt đầu bằng \`## Tiêu đề\`.
- Section cuối tên "Kết luận".
- Dùng **bold**, *italic*, \`inline code\`, danh sách \`- item\` hoặc \`1. item\`, trích dẫn \`> ...\`.
- Có ít nhất 1 blockquote và 1 danh sách.
- Nếu chủ đề là code/dev: thêm 1-2 code block \`\`\`lang ... \`\`\`.
- Chèn 2-3 ảnh minh hoạ bằng cú pháp đặc biệt: \`![alt tiếng Việt](IMG::prompt tiếng Anh mô tả ảnh, digital art, minimalist)\`. Đặt sau heading quan trọng. Server sẽ tự fetch ảnh và thay URL — bạn CHỈ cần viết đúng format này, KHÔNG dùng URL thật, KHÔNG chèn \`<img>\`.
- Có thể nhúng video bằng 1 trong 2 cú pháp, mỗi cái trên dòng riêng (bao quanh bằng dòng trống):
  + \`@youtube[VIDEO_ID]\` (11 ký tự ID YouTube — chỉ dùng khi CHẮC CHẮN ID có thật, không bịa).
  + \`@video[https://...mp4]\` cho file mp4/webm công khai.
  Tối đa 1 video/bài. Nếu không chắc URL/ID → BỎ QUA, dùng ảnh thay.
- 800-1200 từ. Giọng văn thân thiện, chuyên nghiệp, Việt Nam.
- Không chèn link ngoài.
- "from" và "to" là 2 màu hex gradient phù hợp chủ đề (vd AI: #7565f6→#22c5e8; web: #0ea5e9→#8b5cf6).`;

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY (hoặc OPENAI_API_KEY) chưa cấu hình" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  const mode = (body?.mode as "topic" | "random" | "category") || "topic";
  const inputCategory = body?.category as BlogCategory | undefined;
  let topic = body?.topic?.toString().trim() || "";

  const RANDOM_TOPICS: Record<BlogCategory, string[]> = {
    tech: [
      "Chip M5 Pro: Apple silicon đang đi về đâu 2026",
      "USB-C 2.1: tốc độ, sạc và những hiểu lầm phổ biến",
      "Vì sao SSD 2026 vẫn chưa thay thế hoàn toàn HDD",
      "Mini PC thay desktop: trào lưu hay giải pháp lâu dài",
      "E-ink màu 2026: đọc sách, ghi chú và giới hạn thực tế",
    ],
    ai: [
      "RAG vs fine-tuning: khi nào chọn cái nào năm 2026",
      "Local LLM trên MacBook: Ollama, LM Studio và thực tế dùng",
      "AI agent coding: Claude Code, Cursor, Windsurf khác nhau ở đâu",
      "Prompt caching giảm 90% chi phí API — làm thế nào",
      "Multimodal 2026: khi AI nhìn, nghe và thao tác máy tính",
    ],
    web: [
      "React Server Components 2026: khi nào thực sự đáng dùng",
      "Tailwind v4 với CSS variables: thay đổi lớn nhất là gì",
      "View Transitions API: chuyển trang mượt như native app",
      "Edge rendering vs Node runtime: chọn đúng cho Next.js",
      "Partial Prerendering: tương lai của SSR trên Next.js",
    ],
    mobile: [
      "SwiftUI 2026: Observation framework và những pattern mới",
      "Jetpack Compose Multiplatform đã sẵn sàng production chưa",
      "Expo Router v4: file-based routing cho React Native",
      "iOS 19 Live Activities: UX pattern cho app realtime",
      "Flutter 4: Impeller mặc định và hiệu năng thực tế",
    ],
    devops: [
      "Kubernetes 1.32: điểm mới quan trọng cho SRE",
      "Bun vs Node 22 trên production: benchmark thực tế",
      "GitHub Actions caching: giảm 70% thời gian CI thế nào",
      "Observability 2026: OpenTelemetry đã thắng chưa",
      "Zero-downtime migration PostgreSQL quy mô lớn",
    ],
  };

  if (mode === "random") {
    const cats = Object.keys(RANDOM_TOPICS) as BlogCategory[];
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const pool = RANDOM_TOPICS[cat];
    topic = pool[Math.floor(Math.random() * pool.length)];
  } else if (mode === "category") {
    const cat = (inputCategory && RANDOM_TOPICS[inputCategory] ? inputCategory : "tech") as BlogCategory;
    const pool = RANDOM_TOPICS[cat];
    topic = pool[Math.floor(Math.random() * pool.length)];
  }

  if (!topic) return NextResponse.json({ error: "Thiếu topic" }, { status: 400 });

  const useGroq = !!process.env.GROQ_API_KEY;
  const endpoint = useGroq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const defaultModel = useGroq ? "openai/gpt-oss-120b" : "gpt-4o-mini";
  const model = (process.env.OPENAI_BLOG_MODEL || defaultModel).trim();

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Chủ đề: ${topic}` },
      ],
    }),
  });

  if (!resp.ok) {
    const errTxt = await resp.text();
    return NextResponse.json(
      { error: `${useGroq ? "Groq" : "OpenAI"} API lỗi (${resp.status}): ${errTxt.slice(0, 400)}` },
      { status: 502 },
    );
  }

  const data = await resp.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) return NextResponse.json({ error: "LLM trả về rỗng" }, { status: 502 });

  const trimmed = text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
  const metaMatch = trimmed.match(/^META=(\{[\s\S]*?\})\s*\n/);
  if (!metaMatch) {
    return NextResponse.json(
      { error: "Không tìm thấy dòng META=... ở đầu output", raw: trimmed.slice(0, 400) },
      { status: 502 },
    );
  }

  let meta: {
    title?: string;
    excerpt?: string;
    category?: BlogCategory;
    tags?: string[];
    readMin?: number;
    from?: string;
    to?: string;
    label?: string;
    imagePrompt?: string;
  };
  try {
    meta = JSON.parse(metaMatch[1]);
  } catch (e: any) {
    return NextResponse.json({ error: `META không parse được JSON: ${e.message}` }, { status: 502 });
  }

  let md = trimmed.slice(metaMatch[0].length).trim();
  if (!md || !meta.title) {
    return NextResponse.json({ error: "META/markdown không hợp lệ" }, { status: 502 });
  }

  const slug = slugify(meta.title) || slugify(topic);
  const today = new Date().toISOString().slice(0, 10);

  const post: BlogPost = {
    slug,
    title: meta.title,
    excerpt: meta.excerpt || "",
    category:
      mode === "category" && inputCategory
        ? inputCategory
        : (meta.category as BlogCategory) || "tech",
    tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 8) : [],
    author: "FormatBox",
    date: today,
    readMin: Number.isFinite(meta.readMin) ? Number(meta.readMin) : 10,
    cover: {
      from: meta.from || "#7565f6",
      to: meta.to || "#22c5e8",
      label: meta.label || meta.title.split(/\s+/)[0],
    },
    status: "draft",
  };

  // Inline images: ![alt](IMG::prompt) → Pollinations URL thẳng vào markdown.
  // Dùng Flux + seed cố định theo (slug, index) để URL ổn định, ảnh không đổi khi request lại.
  function pollinationsUrl(prompt: string, w: number, h: number, seed: number) {
    const p = prompt.trim().replace(/[‐-―]/g, "-");
    return `/api/img?prompt=${encodeURIComponent(p)}&w=${w}&h=${h}&seed=${seed}`;
  }
  function hashSeed(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  const baseSeed = hashSeed(slug);
  md = md.replace(/!\[([^\]]*)\]\(IMG::([^)]+)\)/g, (_m, alt, prompt, offset: number) => {
    const idx = md.slice(0, offset).match(/!\[[^\]]*\]\(IMG::[^)]+\)/g)?.length ?? 0;
    return `![${alt}](${pollinationsUrl(prompt, 1024, 576, (baseSeed + idx + 1) >>> 0)})`;
  });

  // Cover image: cũng dùng Pollinations URL thẳng.
  const imgPrompt = meta.imagePrompt || `${meta.title}, digital art, minimalist, modern`;
  post.coverImage = pollinationsUrl(imgPrompt, 1200, 630, baseSeed);

  try {
    await insertPost(post, md);
  } catch (e: any) {
    return NextResponse.json({ error: `DB lỗi: ${e.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug, post });
}
