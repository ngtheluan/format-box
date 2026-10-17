import type { Metadata } from "next";
import { categoriesToMap, listPublicCategories, listPublicPosts } from "@/lib/blog";
import { BlogList } from "./BlogList";
import "./blog.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog · FormatBox",
  description:
    "Những bài viết bổ ích về công nghệ, AI, web, bảo mật và nhiều lĩnh vực khác — FormatBox Blog.",
};

export default async function BlogIndex() {
  const [posts, cats] = await Promise.all([listPublicPosts(), listPublicCategories()]);

  return (
    <div className="blog-wrap">
      <BlogList posts={posts} categories={categoriesToMap(cats)} />
    </div>
  );
}
