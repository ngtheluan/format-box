import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconArrowRight, IconArrowUpRight, IconListDetails } from "@tabler/icons-react";
import {
  categoriesToMap,
  formatDateVi,
  getPublicPostCached,
  listPublicCategories,
  listPublicPostsCached,
  parseCoverImage,
  renderMarkdown,
} from "@/lib/blog";
import { BlogCover } from "@/components/BlogCover";
import { BlogCard } from "@/components/BlogCard";
import { BlogAudioPlayer } from "@/components/BlogAudioPlayer";
import { T } from "@/components/T";
import { BlogToc, BodyEnhancer, ReaderTools, ReadingProgress, ShareBar } from "./BlogReader";
import "../blog.css";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const posts = await listPublicPostsCached();
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPublicPostCached(params.slug);
  if (!post) return { title: "Không tìm thấy bài viết · FormatBox" };
  const cover = parseCoverImage(post.coverImage);
  const explicit = cover?.src || null;
  const url = `/blog/${post.slug}`;
  const meta: Metadata = {
    title: `${post.title} — FormatBox`,
    description: post.excerpt,
    keywords: post.tags,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url,
      publishedTime: post.date,
      tags: post.tags,
      ...(explicit ? { images: [{ url: explicit, width: 1200, height: 630, alt: post.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      ...(explicit ? { images: [explicit] } : {}),
    },
  };
  return meta;
}

export default async function BlogDetail({ params }: { params: { slug: string } }) {
  const post = await getPublicPostCached(params.slug);
  if (!post) notFound();

  const { html, toc } = renderMarkdown(post.markdown);
  const [all, cats] = await Promise.all([listPublicPostsCached(), listPublicCategories()]);
  const catMap = categoriesToMap(cats);
  const catLabel = (slug: string) => catMap[slug] || slug;

  const related = all
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  // `all` is newest first: index-1 is the newer post, index+1 the older one.
  const at = all.findIndex((p) => p.slug === post.slug);
  const newer = at > 0 ? all[at - 1] : null;
  const older = at >= 0 && at < all.length - 1 ? all[at + 1] : null;

  const cover = parseCoverImage(post.coverImage);
  const initials = post.author
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://formatbox.site").replace(/\/$/, "");
  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "FormatBox", url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    keywords: post.tags.join(", "),
    ...(cover ? { image: cover.src } : {}),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "FormatBox", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
    ],
  };

  return (
    <div className="bd" key={post.slug}>
      <ReadingProgress />
      <BodyEnhancer slug={post.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* HEAD TILE — breadcrumb, category + tags, title, dek, byline (200Lab style) */}
      <header className="bd-head">
        <i className="bl-corners" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </i>
        <nav className="bd-crumb" aria-label="Breadcrumb">
          <Link href="/" prefetch={false}>
            FormatBox
          </Link>
          <i>/</i>
          <Link href="/blog" prefetch={false}>
            Blog
          </Link>
          <i>/</i>
          <span>{post.title}</span>
        </nav>
        <div className="bd-chips">
          <Link href="/blog" className="bd-chip" prefetch={false}>
            {catLabel(post.category)}
          </Link>
          {post.tags.slice(0, 4).map((tg) => (
            <span key={tg} className="bd-tagchip">
              {tg}
            </span>
          ))}
        </div>
        <h1 className="bd-title">{post.title}</h1>
        {post.excerpt && <p className="bd-dek">{post.excerpt}</p>}
        <div className="bd-byline">
          <span className="bd-avatar" aria-hidden="true">
            {initials || "FB"}
          </span>
          <span className="bd-byline-meta">
            <strong>{post.author}</strong>
            <span className="bd-sep" />
            <time dateTime={post.date}>{formatDateVi(post.date)}</time>
            <span className="bd-sep" />
            <span>
              {post.readMin} <T k="blog_read_min" />
            </span>
            {toc.length > 0 && (
              <>
                <span className="bd-sep" />
                <span>
                  {toc.length} <T k="blog_sections" />
                </span>
              </>
            )}
          </span>
        </div>
      </header>

      {/* READING LAYOUT: article tile | sticky context TOC */}
      <div className={`bd-layout${toc.length ? "" : " no-toc"}`}>
        <article className="bd-article">
          <figure className="bd-figure">
            <BlogCover post={post} variant="hero" />
            {cover?.credit && (
              <figcaption>
                <T k="blog_photo" />:{" "}
                <a href={cover.credit.url} target="_blank" rel="noopener noreferrer">
                  {cover.credit.name}
                </a>{" "}
                / {cover.credit.source}
              </figcaption>
            )}
          </figure>

          <div className="bd-topmeta">
            <BlogAudioPlayer slug={post.slug} />
            <ReaderTools slug={post.slug} title={post.title} markdown={post.markdown} />
          </div>

          {toc.length > 0 && (
            <details className="bd-toc-mobile" open>
              <summary>
                <IconListDetails size={14} stroke={2} /> <T k="blog_toc" /> <span>({toc.length})</span>
              </summary>
              <ol>
                {toc.map((t, i) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`}>
                      <i>{String(i + 1).padStart(2, "0")}</i> {t.text}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )}

          <div className="blog-body" dangerouslySetInnerHTML={{ __html: html }} />

          {post.tags.length > 0 && (
            <div className="bd-tags" aria-label="Tags">
              {post.tags.map((t) => (
                <span key={t} className="bd-tag">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <section className="bd-end" aria-label="End of article">
            <div className="bd-end-mark" aria-hidden="true">
              ·  ·  ·
            </div>
            <h3>Cảm ơn bạn đã đọc đến đây</h3>
            <p>Nếu bài viết hữu ích, hãy chia sẻ hoặc khám phá thêm bài khác trong cùng chủ đề.</p>
            <div className="bd-end-actions">
              <ShareBar title={post.title} path={`/blog/${post.slug}`} />
              <Link href="/blog" className="bd-end-btn">
                Xem tất cả bài viết <IconArrowUpRight size={14} stroke={2} />
              </Link>
            </div>
          </section>
        </article>

        {toc.length > 0 && (
          <aside className="bd-aside">
            <BlogToc toc={toc} title={post.title} />
          </aside>
        )}
      </div>

      {(older || newer) && (
        <nav className="bd-nav" aria-label="Pagination">
          {older ? (
            <Link href={`/blog/${older.slug}`} prefetch={false} className="bd-navlink">
              <span className="bd-navlink-img">
                <BlogCover post={older} size={[240, 160]} />
              </span>
              <span className="bd-navlink-text">
                <span className="bd-navlink-label">
                  <IconArrowLeft size={12} stroke={2} /> <T k="blog_older" />
                </span>
                <strong>{older.title}</strong>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {newer && (
            <Link href={`/blog/${newer.slug}`} prefetch={false} className="bd-navlink is-next">
              <span className="bd-navlink-text">
                <span className="bd-navlink-label">
                  <T k="blog_newer" /> <IconArrowRight size={12} stroke={2} />
                </span>
                <strong>{newer.title}</strong>
              </span>
              <span className="bd-navlink-img">
                <BlogCover post={newer} size={[240, 160]} />
              </span>
            </Link>
          )}
        </nav>
      )}

      {related.length > 0 && (
        <section className="bd-related">
          <div className="bd-related-head">
            <div>
              <span className="bd-related-eyebrow">Khám phá thêm</span>
              <h2>Bài viết liên quan</h2>
            </div>
            <Link href="/blog" className="bd-related-all">
              Xem tất cả <IconArrowRight size={14} stroke={2} />
            </Link>
          </div>
          <div className="bz-grid">
            {related.map((p) => (
              <BlogCard key={p.slug} post={p} catLabel={catLabel(p.category)} readLabel={<T k="blog_read_min" />} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
