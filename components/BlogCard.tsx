import type { ReactNode } from "react";
import Link from "next/link";
import { IconArrowRight, IconArrowUpRight, IconCalendar, IconClock } from "@tabler/icons-react";
import { formatDateVi, type BlogPost } from "@/lib/blog";
import { BlogCover } from "@/components/BlogCover";

type Props = {
  post: BlogPost;
  catLabel: string;
  readLabel: ReactNode;
};

// Standard card: inset photo on a surface, meta + title + excerpt below.
export function BlogCard({ post: p, catLabel, readLabel }: Props) {
  return (
    <Link href={`/blog/${p.slug}`} prefetch={false} className="pc">
      <div className="pc-media">
        <BlogCover post={p} size={[800, 500]} />
      </div>
      <div className="pc-body">
        <div className="pc-meta">
          <span className="pc-cat">{catLabel}</span>
          <span className="pc-read">
            <IconClock size={13} stroke={1.9} /> {p.readMin} {readLabel}
          </span>
        </div>
        <h3 className="pc-title">{p.title}</h3>
        {p.excerpt && <p className="pc-excerpt">{p.excerpt}</p>}
        <div className="pc-foot">
          <time dateTime={p.date}>
            <IconCalendar size={13} stroke={1.9} /> {formatDateVi(p.date)}
          </time>
          <span className="pc-go" aria-hidden="true">
            <IconArrowRight size={15} stroke={2} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Featured story: photo fills the frame, text on a soft scrim.
export function BlogFeature({ post: p, catLabel, readLabel, large = false }: Props & { large?: boolean }) {
  return (
    <Link href={`/blog/${p.slug}`} prefetch={false} className={`pf${large ? " pf--lg" : ""}`}>
      <div className="pf-media">
        <BlogCover post={p} size={large ? [1400, 900] : [800, 520]} variant={large ? "hero" : "card"} />
      </div>
      <div className="pf-body">
        <div className="pf-meta">
          <span className="pf-cat">{catLabel}</span>
          <span className="bc-dot" />
          <span>
            {p.readMin} {readLabel}
          </span>
          <span className="bc-dot" />
          <span>{formatDateVi(p.date)}</span>
        </div>
        <h3>{p.title}</h3>
        {large && p.excerpt && <p>{p.excerpt}</p>}
      </div>
      <span className="pf-go" aria-hidden="true">
        <IconArrowUpRight size={18} stroke={2} />
      </span>
    </Link>
  );
}
