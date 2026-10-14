import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconCalendar, IconClock, IconUser } from "@tabler/icons-react";
import {
  BLOG_CATEGORIES,
  formatDateVi,
  getPublicPost,
  listPublicPosts,
  renderMarkdown,
} from "@/lib/blog";
import { BlogCover } from "@/components/BlogCover";
import "../blog.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPublicPost(params.slug);
  if (!post) return { title: "Không tìm thấy bài viết · FormatBox" };
  return {
    title: `${post.title} · FormatBox Blog`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: "article" },
  };
}

export default async function BlogDetail({ params }: { params: { slug: string } }) {
  const post = await getPublicPost(params.slug);
  if (!post) notFound();

  const { html, toc } = renderMarkdown(post.markdown);

  const related = (await listPublicPosts())
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  return (
    <div className="blog-wrap">
      <nav className="blog-crumb" aria-label="Breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span>/</span>
        <Link href="/blog">Blog</Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>{BLOG_CATEGORIES[post.category]}</span>
      </nav>

      <div className="blog-detail">
        <article>
          <div className="blog-hero">
            <BlogCover post={post} variant="hero" />
          </div>

          <h1 className="blog-title">{post.title}</h1>
          <div className="blog-meta">
            <span className="blog-chip">{BLOG_CATEGORIES[post.category]}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <IconUser size={14} stroke={1.8} /> <strong>{post.author}</strong>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <IconCalendar size={14} stroke={1.8} /> {formatDateVi(post.date)}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <IconClock size={14} stroke={1.8} /> {post.readMin} phút đọc
            </span>
          </div>

          <div className="blog-body" dangerouslySetInnerHTML={{ __html: html }} />

          <div className="blog-tags" aria-label="Tags">
            {post.tags.map((t) => (
              <span key={t} className="blog-tag">
                #{t}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 32 }}>
            <Link
              href="/blog"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--accent)",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              <IconArrowLeft size={16} stroke={1.8} /> Về trang Blog
            </Link>
          </div>

          {related.length > 0 && (
            <section className="blog-related">
              <h3>Bài viết liên quan</h3>
              <div className="blog-related-grid">
                {related.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
                    <div className="blog-card-media">
                      <BlogCover post={p} />
                    </div>
                    <div className="blog-card-body">
                      <div className="blog-card-meta">
                        <span className="blog-chip">{BLOG_CATEGORIES[p.category]}</span>
                        <span>{formatDateVi(p.date)}</span>
                      </div>
                      <h3>{p.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>

        {toc.length > 0 && (
          <aside className="blog-toc" aria-label="Mục lục">
            <h4>Mục lục</h4>
            <ol>
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`}>{t.text}</a>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}
