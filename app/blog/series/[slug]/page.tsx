import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogCover } from "@/components/BlogCover";
import { T } from "@/components/T";
import {
  categoriesToMap,
  formatDateVi,
  groupPostsBySeries,
  listPublicCategories,
  listPublicPosts,
  listReactions,
} from "@/lib/blog";
import { IconArrowRight, IconListNumbers } from "@tabler/icons-react";
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
  if (!group) return { title: "Chuỗi bài · FormatBox" };
  return {
    title: `${group.label} · FormatBox`,
    description: `Chuỗi bài "${group.label}" gồm ${group.parts.length} phần trên FormatBox Blog.`,
  };
}

export default async function BlogSeriesPage({ params }: { params: { slug: string } }) {
  const { cats, popularity, group } = await loadSeries(params.slug);
  if (!group) notFound();
  const catMap = categoriesToMap(cats);
  const totalRead = group.parts.reduce((n, p) => n + (p.readMin || 0), 0);

  return (
    <div className="blog-wrap">
      <header className="bz-hero" aria-labelledby="series-h1">
        <i className="bl-corners" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </i>
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

      <section className="bz-sec bz-series-page" aria-label={group.label}>
        <ol className="bz-series-rows">
          {group.parts.map((p, i) => {
            const helpful = popularity?.[p.slug] ?? 0;
            return (
              <li key={p.slug} className="bz-series-row">
                <Link href={`/blog/${p.slug}`} prefetch={false} className="bz-series-row-link">
                  <span className="bz-series-row-n" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="bz-series-row-media">
                    <BlogCover post={p} size={[320, 180]} />
                  </span>
                  <span className="bz-series-row-body">
                    <span className="bz-series-row-eyebrow">
                      <T k="blog_series_part" /> {i + 1}{" "}
                      <i aria-hidden="true">·</i>{" "}
                      <span>{catMap[p.category] || p.category}</span>
                    </span>
                    <strong>{p.title}</strong>
                    {p.excerpt && <span className="bz-series-row-ex">{p.excerpt}</span>}
                    <span className="bz-series-row-meta">
                      <time dateTime={p.date}>{formatDateVi(p.date)}</time>
                      <i aria-hidden="true">·</i>
                      <span>
                        {p.readMin} <T k="blog_read_min" />
                      </span>
                      {helpful > 0 && (
                        <>
                          <i aria-hidden="true">·</i>
                          <span>
                            {helpful} <T k="blog_helpful_count" />
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="bz-series-row-arrow" aria-hidden="true">
                    <IconArrowRight size={16} stroke={2} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
