// Plain data shared by the admin UI and the blog AI routes (no server imports).

export type AiProvider = "groq" | "gemini" | "pollinations";

export type AiModel = { id: string; label: string; search?: boolean };

export const AI_MODELS: Record<AiProvider, AiModel[]> = {
  groq: [
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", search: true },
    { id: "qwen/qwen3.8-27b", label: "Qwen 3.8 27B" },
    { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B (nhanh)", search: true },
  ],
  gemini: [
    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", search: true },
    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", search: true },
  ],
  pollinations: [{ id: "openai", label: "Pollinations (không key, tác vụ ngắn)" }],
};

export const AI_PROVIDER_LABEL: Record<AiProvider, string> = {
  groq: "Groq",
  gemini: "Google Gemini",
  pollinations: "Pollinations",
};

export type GenTone = "expert" | "friendly" | "tutorial" | "analysis" | "story";
export type GenLength = "short" | "medium" | "long";

export const GEN_TONES: { id: GenTone; label: string; hint: string }[] = [
  { id: "expert", label: "Chuyên gia", hint: "chuyên sâu, chính xác, giọng chuyên gia chia sẻ thực chiến" },
  { id: "friendly", label: "Thân thiện", hint: "gần gũi, dễ hiểu, như trò chuyện với bạn bè, vẫn chính xác" },
  { id: "tutorial", label: "Hướng dẫn", hint: "hướng dẫn từng bước, có điều kiện tiên quyết, bước kiểm chứng và xử lý lỗi" },
  { id: "analysis", label: "Phân tích", hint: "phân tích so sánh, trade-off, ưu nhược điểm, có bảng so sánh khi phù hợp" },
  { id: "story", label: "Kể chuyện", hint: "dẫn dắt bằng tình huống thực tế, giàu hình ảnh nhưng không bịa trải nghiệm cá nhân" },
];

export const GEN_LENGTHS: { id: GenLength; label: string; words: string; sections: string }[] = [
  { id: "short", label: "Ngắn", words: "600–850", sections: "4–5" },
  { id: "medium", label: "Vừa", words: "900–1300", sections: "6–7" },
  { id: "long", label: "Dài", words: "1500–2000", sections: "7–9" },
];

// NDJSON events streamed by /api/blog/generate.
export type GenStep = "topic" | "research" | "write" | "images" | "save";
export type GenEvent =
  | { type: "step"; step: GenStep; status: "start" | "done" | "skip"; detail?: string }
  | { type: "done"; post: any }
  | { type: "error"; error: string };

export type ImageCandidate = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  creditUrl: string;
  source: "unsplash" | "openverse";
  license?: string;
  downloadLocation?: string;
};
