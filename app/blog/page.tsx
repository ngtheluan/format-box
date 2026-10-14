import type { Metadata } from "next";
import Link from "next/link";
import { IconClock, IconCalendar } from "@tabler/icons-react";
import { BLOG_CATEGORIES, formatDateVi, listPublicPosts } from "@/lib/blog";
import { BlogCover } from "@/components/BlogCover";
import "./blog.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog · FormatBox",
  description:
    "Những bài viết bổ ích về công nghệ, AI, web, bảo mật và nhiều lĩnh vực khác — FormatBox Blog.",
};

export default async function BlogIndex() {
  const posts = await listPublicPosts();
  return (
    <div className="blog-wrap">
      <header className="blog-head">
        <h1>Blog FormatBox</h1>
        <p>
          Góc đọc chậm về công nghệ, AI, web và mọi thứ xung quanh — những bài viết được chọn lọc để
          bạn hiểu nhanh và áp dụng được ngay.
        </p>
      </header>

      <div className="blog-cats" aria-label="Danh mục">
        <span className="blog-cat is-active">Tất cả</span>
        {Object.entries(BLOG_CATEGORIES).map(([key, label]) => (
          <span key={key} className="blog-cat">
            {label}
          </span>
        ))}
      </div>

      <div className="blog-grid">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
            <div className="blog-card-media">
              <BlogCover post={p} />
            </div>
            <div className="blog-card-body">
              <div className="blog-card-meta">
                <span className="blog-chip">{BLOG_CATEGORIES[p.category]}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconCalendar size={13} stroke={1.8} /> {formatDateVi(p.date)}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconClock size={13} stroke={1.8} /> {p.readMin} phút đọc
                </span>
              </div>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
