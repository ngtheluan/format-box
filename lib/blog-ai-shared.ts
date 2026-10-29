// Plain data shared by the admin UI and the blog AI routes (no server imports).

export type AiProvider = "groq" | "gemini" | "pollinations";

export type AiSpecialty =
  | "tech"       // deep-dive kỹ thuật, code, kiến trúc
  | "news"       // tin tức/thời sự (ưu tiên model có web search)
  | "review"     // review sản phẩm, so sánh, trade-off
  | "tutorial"   // how-to, hướng dẫn từng bước
  | "explainer"  // giải thích khái niệm cho người không chuyên
  | "story"      // kể chuyện, văn phong tự nhiên
  | "analysis"   // phân tích, deep-dive học thuật
  | "fast"       // tác vụ ngắn, low-latency
  | "general";   // dùng chung, cân bằng

export type AiModel = {
  id: string;
  label: string;
  search?: boolean;
  specialties?: AiSpecialty[];
};

export const AI_MODELS: Record<AiProvider, AiModel[]> = {
  groq: [
    {
      id: "openai/gpt-oss-120b",
      label: "GPT-OSS 120B",
      search: true,
      specialties: ["tech", "news", "review", "tutorial", "analysis", "general"],
    },
    {
      id: "openai/gpt-oss-20b",
      label: "GPT-OSS 20B (nhanh)",
      search: true,
      specialties: ["news", "explainer", "fast"],
    },
    {
      id: "qwen/qwen3.8-27b",
      label: "Qwen 3.8 27B",
      specialties: ["tech", "review", "tutorial", "analysis", "general"],
    },
  ],
  gemini: [
    {
      id: "gemini-3.8-flash",
      label: "Gemini 3.8 Flash",
      search: true,
      specialties: ["news", "explainer", "general", "fast"],
    },
  ],
  pollinations: [
    { id: "openai", label: "Pollinations (không key, tác vụ ngắn)", specialties: ["fast"] },
  ],
};

export const AI_SPECIALTY_LABEL: Record<AiSpecialty, string> = {
  tech: "Công nghệ",
  news: "Tin tức / Thời sự",
  review: "Review / So sánh",
  tutorial: "Hướng dẫn",
  explainer: "Giải thích",
  story: "Kể chuyện",
  analysis: "Phân tích",
  fast: "Siêu nhanh",
  general: "Đa dụng",
};

// Map cấu trúc bài → chuyên môn AI ưu tiên (dùng trong routing của blog-ai.ts).
export const STRUCTURE_TO_SPECIALTY: Record<GenStructure, AiSpecialty[]> = {
  auto: ["general"],
  howto: ["tutorial", "tech"],
  listicle: ["review", "general"],
  deepdive: ["tech", "analysis"],
  comparison: ["review", "analysis"],
  news: ["news"],
  review: ["review"],
  explainer: ["explainer", "general"],
};

// Liệt kê (provider, model) phù hợp với một chuyên môn, theo đúng thứ tự trong AI_MODELS.
export function modelsBySpecialty(
  specialty: AiSpecialty,
): { provider: AiProvider; model: AiModel }[] {
  const out: { provider: AiProvider; model: AiModel }[] = [];
  (Object.keys(AI_MODELS) as AiProvider[]).forEach((p) => {
    AI_MODELS[p].forEach((m) => {
      if (m.specialties?.includes(specialty)) out.push({ provider: p, model: m });
    });
  });
  return out;
}

export type AiPreference = "balanced" | "quality" | "speed";

// Chọn model tốt nhất cho một cấu trúc bài, có xét provider đang khả dụng (có API key).
// prefer: balanced (mặc định), quality (ưu tiên tech/analysis), speed (ưu tiên fast).
export function pickModelForStructure(
  structure: GenStructure,
  available: Partial<Record<AiProvider, boolean>>,
  prefer: AiPreference = "balanced",
): { provider: AiProvider; modelId: string } | null {
  const baseSpecs = STRUCTURE_TO_SPECIALTY[structure] || ["general"];
  const specs: AiSpecialty[] =
    prefer === "quality"
      ? ["tech", "analysis", ...baseSpecs]
      : prefer === "speed"
        ? ["fast", ...baseSpecs]
        : baseSpecs;

  for (const sp of specs) {
    for (const { provider, model } of modelsBySpecialty(sp)) {
      if (available[provider]) return { provider, modelId: model.id };
    }
  }
  // Fallback: provider khả dụng đầu tiên, model đầu tiên.
  const firstProvider = (Object.keys(AI_MODELS) as AiProvider[]).find((p) => available[p]);
  if (firstProvider) return { provider: firstProvider, modelId: AI_MODELS[firstProvider][0].id };
  return null;
}

export const AI_PROVIDER_LABEL: Record<AiProvider, string> = {
  groq: "Groq",
  gemini: "Google Gemini",
  pollinations: "Pollinations",
};

export type GenTone = "expert" | "friendly" | "tutorial" | "analysis" | "story";
export type GenLength = "short" | "medium" | "long";
export type GenAudience = "beginner" | "intermediate" | "expert" | "mixed";
export type GenStructure = "auto" | "howto" | "listicle" | "deepdive" | "comparison" | "news" | "review" | "explainer";
export type GenExtra =
  | "tldr"
  | "faq"
  | "stats"
  | "code"
  | "checklist"
  | "quote"
  | "warning"
  | "example"
  | "glossary"
  | "takeaway";
export type GenCta = "none" | "newsletter" | "readmore" | "share" | "comment";
export type GenRegion = "vn" | "asia" | "global";
export type GenImageStyle = "photo" | "illustration" | "mixed";

export const GEN_CTAS: { id: GenCta; label: string; hint: string }[] = [
  { id: "none", label: "Không có", hint: "Bài kết thúc tự nhiên" },
  { id: "newsletter", label: "Đăng ký nhận bài", hint: "Mời subscribe newsletter cuối bài" },
  { id: "readmore", label: "Đọc bài liên quan", hint: "Gợi ý bài khác đã xuất bản" },
  { id: "share", label: "Mời chia sẻ", hint: "Khuyến khích chia sẻ nếu thấy hữu ích" },
  { id: "comment", label: "Mời bình luận", hint: "Đặt câu hỏi để người đọc tương tác" },
];

export const GEN_REGIONS: { id: GenRegion; label: string; hint: string }[] = [
  { id: "vn", label: "Việt Nam", hint: "Ví dụ, bối cảnh, số liệu ưu tiên VN" },
  { id: "asia", label: "Châu Á", hint: "VN + các nước lân cận" },
  { id: "global", label: "Toàn cầu", hint: "Không giới hạn vùng" },
];

export const GEN_IMAGE_STYLES: { id: GenImageStyle; label: string; hint: string }[] = [
  { id: "photo", label: "Ảnh chụp", hint: "Chỉ ảnh thật trên Unsplash/Pexels" },
  { id: "illustration", label: "Minh hoạ", hint: "Ưu tiên tranh vẽ/vector từ Openverse/Wikimedia" },
  { id: "mixed", label: "Pha trộn", hint: "AI chọn tối ưu theo ngữ cảnh" },
];

export const GEN_AUDIENCES: { id: GenAudience; label: string; hint: string }[] = [
  { id: "beginner", label: "Người mới", hint: "giải thích khái niệm, tránh thuật ngữ nặng, có ví dụ cơ bản" },
  { id: "intermediate", label: "Trung cấp", hint: "giả định đã biết căn bản, đi vào thực hành và trade-off" },
  { id: "expert", label: "Chuyên gia", hint: "đi sâu kỹ thuật, so sánh phương án, dữ kiện chính xác" },
  { id: "mixed", label: "Hỗn hợp", hint: "cân bằng cho nhiều mức độ, có tóm tắt và chú thích thuật ngữ" },
];

export const GEN_STRUCTURES: { id: GenStructure; label: string; hint: string }[] = [
  { id: "auto", label: "Tự chọn", hint: "AI chọn cấu trúc phù hợp với chủ đề" },
  { id: "howto", label: "How-to", hint: "từng bước có kết quả cuối, có điều kiện tiên quyết và troubleshoot" },
  { id: "listicle", label: "Danh sách", hint: "N mục / N công cụ, mỗi mục có mô tả + lý do nên quan tâm" },
  { id: "deepdive", label: "Deep-dive", hint: "phân tích chuyên sâu nguyên lý, cơ chế, kiến trúc" },
  { id: "comparison", label: "So sánh", hint: "A vs B vs C với bảng, trade-off và khuyến nghị theo use case" },
  { id: "news", label: "Tin / Phân tích", hint: "sự kiện mới nhất, ảnh hưởng, phân tích dành cho người bận" },
  { id: "review", label: "Review", hint: "đánh giá có hệ thống: tiêu chí, điểm mạnh/yếu, kết luận" },
  { id: "explainer", label: "Giải thích", hint: "giải mã khái niệm phức tạp cho người không chuyên" },
];

export const GEN_EXTRAS: { id: GenExtra; label: string; hint: string }[] = [
  { id: "tldr", label: "Tóm tắt đầu bài", hint: "3 gạch đầu dòng tóm tắt ngay sau hook" },
  { id: "takeaway", label: "Key takeaways", hint: "box 3-5 điểm chốt trước phần Kết luận" },
  { id: "faq", label: "FAQ cuối bài", hint: "4-6 câu hỏi thường gặp + đáp án ngắn" },
  { id: "stats", label: "Số liệu dẫn chứng", hint: "ưu tiên số liệu có nguồn khi tra cứu web" },
  { id: "code", label: "Code examples", hint: "chèn code block khi phù hợp (bài kỹ thuật)" },
  { id: "example", label: "Ví dụ thực tế", hint: "mỗi mục chính có 1 ví dụ cụ thể, không chung chung" },
  { id: "checklist", label: "Checklist", hint: "cuối bài có danh sách tick-box hành động có thể làm ngay" },
  { id: "quote", label: "Trích dẫn", hint: "chèn 1-2 blockquote từ chuyên gia hoặc nguồn uy tín" },
  { id: "warning", label: "Lưu ý & cảnh báo", hint: "callout cho lỗi phổ biến, cạm bẫy, điểm cần tránh" },
  { id: "glossary", label: "Giải nghĩa thuật ngữ", hint: "định nghĩa 3-6 thuật ngữ chuyên môn ở cuối bài" },
];

export const GEN_TONES: { id: GenTone; label: string; hint: string }[] = [
  { id: "expert", label: "Chuyên gia", hint: "chuyên sâu, chính xác, giọng chuyên gia chia sẻ thực chiến" },
  { id: "friendly", label: "Thân thiện", hint: "gần gũi, dễ hiểu, như trò chuyện với bạn bè, vẫn chính xác" },
  {
    id: "tutorial",
    label: "Hướng dẫn",
    hint: "hướng dẫn từng bước, có điều kiện tiên quyết, bước kiểm chứng và xử lý lỗi",
  },
  {
    id: "analysis",
    label: "Phân tích",
    hint: "phân tích so sánh, trade-off, ưu nhược điểm, có bảng so sánh khi phù hợp",
  },
  {
    id: "story",
    label: "Kể chuyện",
    hint: "dẫn dắt bằng tình huống thực tế, giàu hình ảnh nhưng không bịa trải nghiệm cá nhân",
  },
];

export const GEN_LENGTHS: { id: GenLength; label: string; words: string; sections: string }[] = [
  { id: "short", label: "Ngắn", words: "600–850", sections: "4–5" },
  { id: "medium", label: "Vừa", words: "900–1300", sections: "6–7" },
  { id: "long", label: "Dài", words: "1500–2000", sections: "7–9" },
];

// NDJSON events streamed by /api/blog/generate.
export type GenStep = "topic" | "research" | "outline" | "write" | "factcheck" | "linking" | "images" | "save";
export type GenEvent =
  | { type: "step"; step: GenStep; status: "start" | "done" | "skip"; detail?: string }
  | { type: "ping" }
  | { type: "done"; post: any }
  | { type: "error"; error: string };

export type ImageCandidate = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  creditUrl: string;
  source: "unsplash" | "openverse" | "pexels" | "wikimedia" | "pollinations";
  license?: string;
  downloadLocation?: string;
};
