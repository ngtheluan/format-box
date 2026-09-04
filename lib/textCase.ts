// Split any input into an ordered list of word-tokens.
// Handles camelCase, PascalCase, snake_case, kebab-case, whitespace, punctuation.
export function tokenize(input: string): string[] {
  if (!input) return [];
  const withSpaces = input
    // camel / Pascal boundaries: aB → a B, ABc → AB c
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    // split on separators (space, _, -, . / etc)
    .replace(/[_\-./|+]+/g, " ");
  return withSpaces.split(/\s+/).filter(Boolean);
}

const cap = (w: string) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "");
const low = (w: string) => w.toLowerCase();

export const cases = {
  upper: (s: string) => s.toUpperCase(),
  lower: (s: string) => s.toLowerCase(),
  title: (s: string) => tokenize(s).map(cap).join(" "),
  sentence: (s: string) => {
    const t = s.toLowerCase();
    return t.replace(/(^\s*[a-zà-ỹ])|([.!?]\s+[a-zà-ỹ])/gu, (m) => m.toUpperCase());
  },
  camel: (s: string) =>
    tokenize(s)
      .map((w, i) => (i === 0 ? low(w) : cap(w)))
      .join(""),
  pascal: (s: string) => tokenize(s).map(cap).join(""),
  snake: (s: string) => tokenize(s).map(low).join("_"),
  constant: (s: string) => tokenize(s).map((w) => w.toUpperCase()).join("_"),
  kebab: (s: string) => tokenize(s).map(low).join("-"),
  dot: (s: string) => tokenize(s).map(low).join("."),
  path: (s: string) => tokenize(s).map(low).join("/"),
  alt: (s: string) =>
    Array.from(s)
      .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
      .join(""),
  invert: (s: string) =>
    Array.from(s)
      .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
      .join(""),
  reverse: (s: string) => Array.from(s).reverse().join(""),
} as const;

export type CaseKey = keyof typeof cases;

export const caseList: { key: CaseKey; title: string; sub: string }[] = [
  { key: "upper", title: "UPPER CASE", sub: "TAT CA CHU HOA" },
  { key: "lower", title: "lower case", sub: "tat ca chu thuong" },
  { key: "title", title: "Title Case", sub: "Viet Hoa Chu Cai Dau" },
  { key: "sentence", title: "Sentence case", sub: "Kiểu câu" },
  { key: "camel", title: "camelCase", sub: "camelCaseName" },
  { key: "pascal", title: "PascalCase", sub: "PascalCaseName" },
  { key: "snake", title: "snake_case", sub: "snake_case_name" },
  { key: "constant", title: "CONSTANT_CASE", sub: "SCREAM_SNAKE" },
  { key: "kebab", title: "kebab-case", sub: "url-slug" },
  { key: "dot", title: "dot.case", sub: "dotted.path" },
  { key: "path", title: "path/case", sub: "unix/path" },
  { key: "alt", title: "aLtErNaTe", sub: "spOnGeCaSe" },
  { key: "invert", title: "iNVERT", sub: "flip mỗi chữ" },
  { key: "reverse", title: "Reverse", sub: "đảo thứ tự" },
];
