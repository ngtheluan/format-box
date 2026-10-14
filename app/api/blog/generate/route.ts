import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/admin-auth";
import {
  appendLocalPost,
  slugify,
  writePostMarkdown,
  type BlogPost,
  type BlogCategory,
} from "@/lib/blog";

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
  const topic = body?.topic?.toString().trim();
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
    category: (meta.category as BlogCategory) || "tech",
    tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 8) : [],
    author: "FormatBox",
    date: today,
    readMin: Number.isFinite(meta.readMin) ? Number(meta.readMin) : 10,
    cover: {
      from: meta.from || "#7565f6",
      to: meta.to || "#22c5e8",
      label: meta.label || meta.title.split(/\s+/)[0],
    },
  };

  // Fetch inline images: ![alt](IMG::prompt) → saved to /blog-covers/<slug>-N.jpg
  const inlineDir = path.join(process.cwd(), "public", "blog-covers");
  await fs.mkdir(inlineDir, { recursive: true });
  const markers = [...md.matchAll(/!\[([^\]]*)\]\(IMG::([^)]+)\)/g)];
  for (let i = 0; i < markers.length; i++) {
    const [whole, alt, prompt] = markers[i];
    const name = `${slug}-${i + 1}.jpg`;
    try {
      const seed = Math.floor(Math.random() * 1_000_000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}?width=1024&height=576&nologo=true&seed=${seed}&model=flux`;
      const r = await fetch(url);
      if (r.ok) {
        await fs.writeFile(path.join(inlineDir, name), Buffer.from(await r.arrayBuffer()));
        md = md.replace(whole, `![${alt}](/blog-covers/${name})`);
      } else {
        md = md.replace(whole, "");
      }
    } catch {
      md = md.replace(whole, "");
    }
  }

  await writePostMarkdown(slug, md);

  // Cover image via Pollinations (best-effort).
  const imgPrompt = meta.imagePrompt || `${meta.title}, digital art, minimalist, modern`;
  const coverDir = path.join(process.cwd(), "public", "blog-covers");
  await fs.mkdir(coverDir, { recursive: true });
  try {
    const seed = Math.floor(Math.random() * 1_000_000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1200&height=630&nologo=true&seed=${seed}&model=flux`;
    const imgResp = await fetch(url);
    if (imgResp.ok) {
      const buf = Buffer.from(await imgResp.arrayBuffer());
      await fs.writeFile(path.join(coverDir, `${slug}.jpg`), buf);
      post.coverImage = `/blog-covers/${slug}.jpg`;
    }
  } catch {}

  await appendLocalPost(post, "draft");

  return NextResponse.json({ ok: true, slug, post });
}
