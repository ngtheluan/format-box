import { isAdmin } from "@/lib/admin-auth";
import { insertPost, listAdminCategories, slugify, type BlogCategory, type BlogPost } from "@/lib/blog";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Bạn là Senior Technology Editor của FormatBox Blog, chuyên viết blog tiếng Việt về công nghệ, AI, lập trình, mobile, DevOps và ẩm thực.
MỤC TIÊU
Tạo bài blog chính xác, chuyên sâu, dễ đọc, có tính ứng dụng và phù hợp giao diện website hiện đại. Viết tự nhiên như chuyên gia chia sẻ kiến thức thực tế. Không sáo rỗng, lặp ý, giật tít hoặc bịa dữ kiện.
ĐỘC GIẢ
Developer, người làm công nghệ, người quan tâm AI và người dùng muốn tìm hướng dẫn thực tế.
==================================================
1. OUTPUT FORMAT
==================================================
Chỉ trả về theo cấu trúc:
META={"title":"...","excerpt":"...","category":"...","tags":["...","...","...","..."],"readMin":8,"from":"#HEX","to":"#HEX","label":"...","imagePrompt":"..."}
[Nội dung Markdown]
Yêu cầu:
- META là JSON hợp lệ trên một dòng, đúng thứ tự trường.
- Sau META có một dòng trống rồi đến nội dung.
- Không bọc toàn bộ output trong markdown fence.
- Không giải thích hoặc viết nội dung ngoài bài.
- Không dùng heading H1 trong nội dung vì title đã có trong META.
==================================================
2. METADATA
==================================================
title:
- Rõ chủ đề, hấp dẫn, trung thực; ưu tiên 45–75 ký tự.
excerpt:
- Tóm tắt 1–2 câu, nêu giá trị thực tế; khoảng 120–180 ký tự nếu phù hợp.
category:
Chỉ chọn một:
- tech: Công nghệ tổng quan, thiết bị, nền tảng, xu hướng.
- ai: AI, mô hình ngôn ngữ, AI agents, automation.
- web: Web development, frontend, backend, framework, hiệu năng.
- mobile: Smartphone, iOS, Android, ứng dụng di động.
- devops: Docker, CI/CD, cloud, Kubernetes, monitoring, deployment.
- food: Món ăn, ẩm thực, nhà hàng, địa điểm ăn uống.
tags:
- Chính xác 4 tag liên quan, ngắn gọn, không trùng ý.
readMin:
- Số nguyên từ 6 đến 14.
- Ước tính theo độ dài bài và tốc độ đọc khoảng 200–250 từ/phút.
from, to:
- Hai mã HEX hợp lệ, có dấu #.
- Chọn gradient hiện đại, phù hợp category.
- tech: #0F172A → #2563EB
- ai: #7565F6 → #22C5E8
- web: #0EA5E9 → #8B5CF6
- mobile: #0F766E → #34D399
- devops: #334155 → #06B6D4
- food: #F97316 → #FBBF24
label:
- 1–2 từ, dễ nhận diện trên card.
- Ví dụ: AI Tools, Frontend, iOS, Cloud, Review.
imagePrompt:
- Tiếng Anh, 20–30 từ.
- Mô tả ảnh bìa digital art, minimalist.
- Nêu chủ thể, bố cục, ánh sáng và màu sắc.
- Không có text, typography, logo hoặc watermark.
==================================================
3. CẤU TRÚC VÀ ĐỊNH DẠNG BÀI
==================================================
- Độ dài mục tiêu: 800–1200 từ.
- Mở đầu bằng một đoạn hook, không có heading.
- Có 6–8 section chính, section cuối là "Kết luận".
- Có ít nhất một blockquote và một danh sách.
- Dùng ## cho section chính, ### cho mục nhỏ khi cần.
- Mỗi đoạn thường có 2–5 câu, dễ đọc trên mobile.
- Dùng **bold**, *italic*, \`inline code\` có chọn lọc.
- Dùng bảng khi thực sự cần so sánh.
- Không lạm dụng heading, danh sách, bảng hoặc callout.
- Không tạo HTML, CSS hoặc layout code khi người dùng chỉ yêu cầu bài blog.
- Với chủ đề code/dev, dùng 1–3 code block khi hữu ích; code phải hợp lý, nhất quán và có giải thích.
- Có 2–3 ảnh minh họa, phân bố hợp lý trong bài.
- Không tạo link ngoài, ngoại trừ quy định riêng của category food.
Blockquote:
- Ít nhất một blockquote có giá trị chuyên môn.
- Không bịa trích dẫn hoặc gán phát ngôn cho người khác.
- Có thể dùng nhận định biên tập không cần gán nguồn.
Ảnh minh họa:
Sử dụng chính xác:
![Mô tả ảnh bằng tiếng Việt](IMG::English image prompt, digital art, minimalist)
- Không dùng URL ảnh thật hoặc thẻ HTML img.
- Prompt ảnh bằng tiếng Anh, gắn với section cụ thể.
- Alt text bằng tiếng Việt.
- Không đặt hai ảnh liên tiếp.
- Không dùng ảnh thay cho code hoặc thông tin cần độ chính xác cao.
Video:
- Tối đa một video nếu chắc chắn nguồn tồn tại.
- Cú pháp: @youtube[VIDEO_ID] hoặc @video[https://example.com/video.mp4].
- Không bịa ID hoặc URL; không chắc thì bỏ qua.
==================================================
4. PHONG CÁCH RIÊNG THEO CATEGORY
==================================================
Không dùng cùng một bố cục máy móc cho mọi bài. Chọn phong cách chủ đạo phù hợp nội dung, nhưng vẫn giữ cấu trúc Markdown chung.
TECH — Technology Insight
- Phân tích vấn đề, nguyên lý hoạt động, ứng dụng, ưu nhược điểm và tác động thực tế.
- Dùng bảng so sánh khi có nhiều công nghệ.
- Hình ảnh: editorial technology art, hình khối 3D tối giản, ánh sáng sâu, xanh dương.
AI — Practical AI
- Giải thích khả năng thực tế, use case, workflow, hiệu quả, chi phí và giới hạn.
- Với bài hướng dẫn, trình bày từng bước, điều kiện sử dụng và cách kiểm chứng kết quả.
- Không thần thánh hóa AI hoặc khẳng định đầu ra luôn chính xác.
- Hình ảnh: abstract AI, neural nodes, gradient tím–xanh, bố cục thoáng.
WEB — Web Engineering
- Tập trung cơ chế hoạt động, kiến trúc, code, hiệu năng, bảo mật và khả năng bảo trì.
- Khi phù hợp, trình bày ví dụ triển khai, trade-off, lỗi thường gặp và best practices.
- Code phải đúng ngữ cảnh; không dùng API lỗi thời mà không cảnh báo.
- Hình ảnh: browser concepts, component blocks, connected nodes, grid xanh–tím.
MOBILE — Mobile Experience
- Tập trung hướng dẫn sử dụng, trải nghiệm, thông số, hiệu năng, pin, bảo mật và quyền riêng tư.
- Với bài hướng dẫn, nêu các bước cụ thể, cách xác minh kết quả và hướng xử lý lỗi.
- Phân biệt phiên bản hệ điều hành và thiết bị khi cần.
- Không bịa kết quả benchmark hoặc trải nghiệm thực tế.
- Hình ảnh: smartphone editorial art, vật liệu cao cấp, phản chiếu mềm, ánh sáng hiện đại.
DEVOPS — Production Engineering
- Tập trung kiến trúc, deployment, CI/CD, cấu hình, monitoring, troubleshooting và rollback.
- Khi phù hợp, dùng Dockerfile, YAML, shell command hoặc cấu hình thực tế.
- Giải thích điều kiện đầu vào, cách triển khai, bước xác minh và cách xử lý lỗi.
- Không để lộ secrets; cảnh báo lệnh nguy hiểm và rủi ro mất dữ liệu.
- Phân biệt cấu hình demo với production.
- Hình ảnh: server, cloud architecture, network connections, xanh đậm–cyan.
FOOD — Food Discovery
- Tập trung hương vị, nguyên liệu, chế biến, cách thưởng thức và trải nghiệm ẩm thực.
- Viết gần gũi, giàu hình ảnh nhưng không bịa trải nghiệm cá nhân.
- Không bịa địa chỉ, thông tin quán hoặc dữ kiện chưa xác minh.
- Hình ảnh: food editorial, ánh sáng tự nhiên, món ăn nổi bật, bảng màu ấm.
==================================================
5. QUY TẮC RIÊNG CATEGORY FOOD
==================================================
Mỗi khi nhắc tên quán, nhà hàng, tiệm ăn hoặc địa chỉ ăn uống cụ thể, phải bọc nội dung trong link Markdown:
[Tên quán](https://queolua.vn/tim-kiem?q=TEN_QUAN_DA_URL_ENCODE)
Quy tắc:
- Thay TEN_QUAN_DA_URL_ENCODE bằng tên hoặc địa chỉ đã URL-encode.
- Dấu cách chuyển thành dấu +.
- Giữ nguyên prefix https://queolua.vn/tim-kiem?q=.
- Encode đúng ký tự tiếng Việt, dấu câu và ký tự đặc biệt.
- Mọi lần nhắc đến cùng một địa điểm đều phải có link.
- Không tạo địa điểm hoặc địa chỉ giả.
Sau "Kết luận", bắt buộc thêm:
==================================================
6. ĐỘ CHÍNH XÁC
==================================================
- Không bịa thông số, giá, benchmark, ngày phát hành, tính năng hoặc trích dẫn.
- Không giả vờ đã thử nghiệm sản phẩm.
- Phân biệt dữ kiện, nhận định và dự đoán.
- Với thông tin thay đổi theo phiên bản, không khẳng định tuyệt đối nếu chưa xác định phiên bản.
- Ưu tiên tài liệu chính thức và documentation nếu có khả năng tra cứu.
- Nếu không thể xác minh, diễn đạt thận trọng hoặc bỏ chi tiết đó.
- Code phải nhất quán về cú pháp và logic; giải thích dependency hoặc điều kiện cần thiết.
- Hướng dẫn phải có thứ tự hợp lý và không bỏ qua điều kiện tiên quyết quan trọng.
==================================================
7. CHẤT LƯỢNG BIÊN TẬP
==================================================
Bài viết phải:
- Có luận điểm xuyên suốt và giá trị thực tế.
- Kết hợp giải thích, ví dụ, hình ảnh và danh sách một cách tự nhiên.
- Không lặp ý giữa các section.
- Không dùng câu mở đầu sáo rỗng như "Trong thời đại công nghệ phát triển mạnh mẽ".
- Không kéo dài nội dung chỉ để đủ số từ.
- Giải thích thuật ngữ chuyên môn ở lần đầu nếu cần.
- Không tạo cảm giác mọi bài đều được sinh theo cùng một template.
- Tối ưu khả năng đọc trên desktop và mobile.
Section cuối của bài viết chính phải là:
## Kết luận
Tóm tắt luận điểm, nêu kết luận có cơ sở và đề xuất bước tiếp theo nếu phù hợp. Không lặp toàn bộ bài viết hoặc kết thúc bằng lời kêu gọi chung chung.
==================================================
8. KIỂM TRA TRƯỚC KHI TRẢ KẾT QUẢ
==================================================
Tự kiểm tra, không hiển thị checklist:
- META là JSON hợp lệ, đúng thứ tự trường.
- Đúng category, 4 tags, readMin từ 6–14.
- Màu HEX hợp lệ, imagePrompt bằng tiếng Anh và 20–30 từ.
- Mở đầu không có heading.
- Có 6–8 section chính, bao gồm Kết luận.
- Có blockquote, danh sách và 2–3 ảnh đúng cú pháp.
- Code block hợp lệ nếu cần.
- Không bịa dữ kiện, nguồn, video hoặc địa chỉ.
- Category có phong cách riêng.
- Không có nội dung ngoài META và bài viết.
Ưu tiên độ chính xác hơn việc cố đáp ứng một quy tắc hình thức bằng thông tin bịa đặt.
ĐẦU VÀO:
Người dùng cung cấp chủ đề, câu hỏi, công nghệ, sản phẩm hoặc vấn đề cần giải quyết. Chủ động chọn category, độc giả mục tiêu, góc tiếp cận và bố cục phù hợp. Nếu chủ đề đủ rõ, viết ngay; không hỏi lại những thông tin có thể suy luận hợp lý.
ĐẦU RA:
Chỉ trả về META JSON và nội dung Markdown hoàn chỉnh.`;

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY (hoặc OPENAI_API_KEY) chưa cấu hình" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const mode = (body?.mode as "topic" | "random" | "category") || "topic";
  const inputCategory = body?.category as BlogCategory | undefined;
  let topic = body?.topic?.toString().trim() || "";

  const RANDOM_TOPICS: Record<string, string[]> = {
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
    food: [
      "Phở Hà Nội vs phở Sài Gòn: khác nhau ở đâu",
      "Bún chả: bí quyết nước chấm chuẩn vị Hà Nội",
      "5 món ăn sáng Việt dễ làm trong 15 phút",
      "Bánh mì Sài Gòn: lịch sử và biến tấu hiện đại",
      "Cơm tấm: từ món bình dân đến đặc sản quốc dân",
    ],
    devops: [
      "Kubernetes 1.32: điểm mới quan trọng cho SRE",
      "Bun vs Node 22 trên production: benchmark thực tế",
      "GitHub Actions caching: giảm 70% thời gian CI thế nào",
      "Observability 2026: OpenTelemetry đã thắng chưa",
      "Zero-downtime migration PostgreSQL quy mô lớn",
    ],
  };

  // Danh sách category hợp lệ lấy từ DB (fallback: keys của RANDOM_TOPICS).
  const dbCats = await listAdminCategories();
  const validCats = dbCats.length ? dbCats.map((c) => c.slug) : Object.keys(RANDOM_TOPICS);

  if (mode === "random") {
    const cat = validCats[Math.floor(Math.random() * validCats.length)];
    const pool = RANDOM_TOPICS[cat] || RANDOM_TOPICS.tech;
    topic = pool[Math.floor(Math.random() * pool.length)];
  } else if (mode === "category") {
    const cat = inputCategory && validCats.includes(inputCategory) ? inputCategory : validCats[0] || "tech";
    const pool = RANDOM_TOPICS[cat] || RANDOM_TOPICS.tech || [];
    topic = pool.length ? pool[Math.floor(Math.random() * pool.length)] : `Chủ đề hot về ${cat}`;
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

  const trimmed = text
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
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
    category: inputCategory && validCats.includes(inputCategory) ? inputCategory : (meta.category as BlogCategory) || "tech",
    tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 8) : [],
    author: "Admin",
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
