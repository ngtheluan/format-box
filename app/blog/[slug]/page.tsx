import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { categoryLabel, formatDate, getAllPosts, getPost } from "@/lib/blog";
import "../blog.css";

export const revalidate = 3600;

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
    <article className="blog-article">
      <Link href="/blog" className="blog-article-back">
        ← Về danh sách
      </Link>

      <header className="blog-article-head">
        <span className="tag">{categoryLabel(post.category)}</span>
        <h1>{post.title}</h1>
        <div className="meta">
          <span>{post.author}</span>
          <span>·</span>
          <span>{formatDate(post.publishedAt)}</span>
          <span>·</span>
          <span>{post.readingMinutes} phút đọc</span>
        </div>
      </header>

      <div className="blog-body" dangerouslySetInnerHTML={{ __html: html }} />

      {post.tags.length > 0 && (
        <footer className="blog-article-foot">
          {post.tags.map((tag) => (
            <span key={tag} className="t">
              #{tag}
            </span>
          ))}
        </footer>
      )}
    </article>
  );
}
