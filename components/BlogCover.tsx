import { rewriteImgUrl, type BlogPost } from "@/lib/blog";

type Props = {
  post: BlogPost;
  variant?: "card" | "hero";
};

// Auto-generated SVG cover — gradient + initials/label + decorative shapes.
// Deterministic from slug, so each post has a stable, unique visual.
export function BlogCover({ post, variant = "card" }: Props) {
  if (post.coverImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={rewriteImgUrl(post.coverImage)} alt={post.title} className="blog-cover-img" />;
  }
  const w = variant === "hero" ? 1200 : 640;
  const h = variant === "hero" ? 540 : 360;
  const id = `bg-${post.slug}`;
  const seed = hashSeed(post.slug);
  const dots = Array.from({ length: 14 }, (_, i) => {
    const r = rand(seed + i);
    return {
      cx: r(0, w),
      cy: r(0, h),
      r: r(14, 48),
      op: r(6, 18) / 100,
    };
  });
  const initials = (post.cover.label || post.title)
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={post.title}
      className="blog-cover-svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={post.cover.from} />
          <stop offset="100%" stopColor={post.cover.to} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="30%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${id})`} />
      <rect width={w} height={h} fill={`url(#${id}-glow)`} />
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#ffffff" opacity={d.op} />
      ))}
      <text
        x={variant === "hero" ? 56 : 32}
        y={variant === "hero" ? 110 : 72}
        fontFamily="'Be Vietnam Pro', system-ui, sans-serif"
        fontSize={variant === "hero" ? 22 : 16}
        fontWeight={600}
        fill="#ffffff"
        opacity={0.85}
        letterSpacing="2"
      >
        {post.category.toUpperCase()} · FORMATBOX BLOG
      </text>
      <text
        x={variant === "hero" ? 56 : 32}
        y={variant === "hero" ? h - 60 : h - 36}
        fontFamily="'Be Vietnam Pro', system-ui, sans-serif"
        fontSize={variant === "hero" ? 180 : 108}
        fontWeight={800}
        fill="#ffffff"
        opacity={0.95}
      >
        {initials}
      </text>
      <text
        x={variant === "hero" ? w - 56 : w - 32}
        y={variant === "hero" ? h - 56 : h - 32}
        textAnchor="end"
        fontFamily="'Be Vietnam Pro', system-ui, sans-serif"
        fontSize={variant === "hero" ? 28 : 20}
        fontWeight={700}
        fill="#ffffff"
        opacity={0.9}
      >
        {post.cover.label}
      </text>
    </svg>
  );
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed: number) {
  let s = seed >>> 0;
  return (min: number, max: number) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    const r = s / 0xffffffff;
    return Math.round(min + r * (max - min));
  };
}
