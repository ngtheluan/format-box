import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Corners } from "@/components/BlogCard";
import { BlogCover } from "@/components/BlogCover";
import { T } from "@/components/T";
import { Stack } from "@/components/ui";
import {
  categoriesToMap,
  formatDateVi,
  groupPostsBySeries,
  listPublicCategories,
  listPublicPosts,
  listReactions,
} from "@/lib/blog";
import { IconArrowRight, IconClock, IconListNumbers, IconUsers } from "@tabler/icons-react";
import "../../blog.css";

export const dynamic = "force-dynamic";

async function loadSeries(slugParam: string) {
  const [posts, cats, popularity] = await Promise.all([
    listPublicPosts(),
    listPublicCategories(),
    listReactions(),
  ]);
  const slug = decodeURIComponent(slugParam).toLowerCase();
  const group = groupPostsBySeries(posts).find((g) => g.slug === slug);
  return { posts, cats, popularity, group };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { group } = await loadSeries(params.slug);
  if (!group) return { title: "Series Bài viết · FormatBox" };
  return {
    title: `${group.label} · FormatBox`,
    description: `Series Bài viết "${group.label}" gồm ${group.parts.length} phần trên FormatBox Blog.`,
  };
}

export default async function BlogSeriesPage({ params }: { params: { slug: string } }) {
  const { cats, popularity, group } = await loadSeries(params.slug);
  if (!group) notFound();
  const catMap = categoriesToMap(cats);
  const totalRead = group.parts.reduce((n, p) => n + (p.readMin || 0), 0);

  return (
    <div className="blog-wrap">
      <Stack gap={28}>
      <header className="bz-hero" aria-labelledby="series-h1">
        <i className="bl-corners" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </i>
        <nav className="bz-crumb" aria-label="Breadcrumb">
          <Link href="/" prefetch={false}>FormatBox</Link>
          <i>/</i>
          <Link href="/blog" prefetch={false}>Blog</Link>
          <i>/</i>
          <Link href="/blog/series" prefetch={false}>Series</Link>
          <i>/</i>
          <span>{group.label}</span>
        </nav>
        <span className="bz-eyebrow">
          <IconListNumbers size={14} stroke={2} /> <T k="blog_series_title" />
        </span>
        <h1 id="series-h1" className="bz-title">
          {group.label}
        </h1>
        <p className="bz-dek">
          {group.parts.length} <T k="blog_series_count_many" /> · ~{totalRead}{" "}
          <T k="blog_read_min" />
        </p>
      </header>

      <section className="bz-sec" aria-label={group.label}>
        <header className="bz-sec-head">
          <h2>
            <T k="blog_series_title" /> ({group.parts.length})
          </h2>
        </header>
        <div className="bz-series-list">
          {group.parts.map((p, i) => {
            const helpful = popularity?.[p.slug] ?? 0;
            return (
              <article key={p.slug} className="bz-tile bz-series-card">
                <Corners />
                <Link href={`/blog/${p.slug}`} prefetch={false} className="bz-series-card-link">
                  <span className="bz-series-cover">
                    <BlogCover post={p} size={[640, 360]} />
                    <span className="bz-series-badge">
                      <IconListNumbers size={12} stroke={2.2} />
                      <T k="blog_series_part" /> {i + 1}
                    </span>
                  </span>
                  <span className="bz-series-body">
                    <span className="bz-series-cat">{catMap[p.category] || p.category}</span>
                    <h3 className="bz-series-title">{p.title}</h3>
                    <ul className="bz-series-meta">
                      <li>
                        <IconClock size={14} stroke={2} />
                        <span>
                          {p.readMin} <T k="blog_read_min" />
                        </span>
                      </li>
                      <li>
                        <time dateTime={p.date}>{formatDateVi(p.date)}</time>
                      </li>
                      {helpful > 0 && (
                        <li>
                          <IconUsers size={14} stroke={2} />
                          <span>
                            {helpful} <T k="blog_helpful_count" />
                          </span>
                        </li>
                      )}
                    </ul>
                    {p.excerpt && <p className="bz-series-ex">{p.excerpt}</p>}
                  </span>
                  <span className="bz-series-cta-slot">
                    <span className="bz-series-cta-btn">
                      Đọc phần {i + 1}
                      <IconArrowRight size={16} stroke={2.2} />
                    </span>
                  </span>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
      </Stack>
    </div>
  );
}
