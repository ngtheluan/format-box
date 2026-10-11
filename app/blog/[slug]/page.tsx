import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { categoryLabel, formatDate, getAllPosts, getPost } from "@/lib/blog";
import "../blog.css";

export const revalidate = 3600;

const CAT_GLYPH: Record<string, string> = {
  web: "{ }",
  backend: "DB",
  ai: "AI",
  devops: "λ",
};

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Không tìm thấy bài viết" };
  return {
    title: `${post.title} — Blog FormatBox`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt },
  };
}

export default async function BlogDetail({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  marked.setOptions({ gfm: true, breaks: false });
  const html = await marked.parse(post.body);

  return (
    <div className="blog-root">
      <div className="b-article">
        <Link href="/blog" className="b-back">
          ← Về danh sách
        </Link>

        <div className="b-crumb">
          <Link href="/blog">Blog</Link> / <Link href={`/blog/category/${post.category}`}>{categoryLabel(post.category)}</Link>
        </div>

        <header className="b-art-head">
          <span className="pill">{categoryLabel(post.category)}</span>
          <h1>{post.title}</h1>
          <p className="lead">{post.excerpt}</p>
          <div className="b-art-meta">
            <span>
              <b>{post.author}</b>
            </span>
            <span>·</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readingMinutes} phút đọc</span>
          </div>
        </header>

        <div className="b-art-cover">
          <div className="cov" data-cat={post.category}>
            <div className="glyph">{CAT_GLYPH[post.category] ?? "·"}</div>
          </div>
        </div>

        <div className="b-body" dangerouslySetInnerHTML={{ __html: html }} />

        <footer className="b-art-foot">
          {post.tags.length > 0 && (
            <div className="tags">
              {post.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
          <Link href="/blog" className="back-cta">
            ← Đọc bài khác
          </Link>
        </footer>
      </div>
    </div>
  );
}
