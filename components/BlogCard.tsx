import type { ReactNode } from "react";
import Link from "next/link";
import { formatDateVi, type BlogPost } from "@/lib/blog";
import { BlogCover } from "@/components/BlogCover";

type Props = {
  post: BlogPost;
  catLabel: string;
  readLabel: ReactNode;
};

// Decorative corner brackets — the blueprint crop marks on each boxed section.
export function Corners() {
  return (
    <i className="bl-corners" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </i>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Blueprint tile: framed 16:9 photo, category, title, date · read time, author.
export function BlogCard({ post: p, catLabel, readLabel }: Props) {
  return (
    <Link href={`/blog/${p.slug}`} prefetch={false} className="bzc">
      <Corners />
      <span className="bzc-media">
        <BlogCover post={p} size={[800, 450]} />
      </span>
      <span className="bzc-body">
        <span className="bzc-cat">{catLabel}</span>
        <h3 className="bzc-title">{p.title}</h3>
        <span className="bzc-meta">
          <time dateTime={p.date}>{formatDateVi(p.date)}</time>
          <i aria-hidden="true">·</i>
          <span>
            {p.readMin} {readLabel}
          </span>
        </span>
        <span className="bzc-author">
          <span className="bz-avatar">{initials(p.author)}</span>
          {p.author}
        </span>
      </span>
    </Link>
  );
}
