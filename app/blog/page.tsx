import type { Metadata } from "next";
import { listPublicPosts } from "@/lib/blog";
import { BlogList } from "./BlogList";
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

      <BlogList posts={posts} />
    </div>
  );
}
