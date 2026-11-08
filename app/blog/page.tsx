import type { Metadata } from "next";
import { isSuperAdmin } from "@/lib/admin-auth";
import {
  categoriesToMap,
  listPublicCategories,
  listPublicDidYouKnow,
  listPublicPosts,
  listReactions,
} from "@/lib/blog";
import { AutoStallAlert } from "./AutoStallAlert";
import { BlogList } from "./BlogList";
import "./blog.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bài viết · FormatBox",
  description:
    "Những bài viết bổ ích về công nghệ, AI, web, bảo mật và nhiều lĩnh vực khác — FormatBox Blog.",
};

export default async function BlogIndex() {
  const [posts, cats, dyk, popularity, superAdmin] = await Promise.all([
    listPublicPosts(),
    listPublicCategories(),
    listPublicDidYouKnow(),
    listReactions(),
    isSuperAdmin(),
  ]);

  return (
    <div className="blog-wrap">
      {superAdmin && <AutoStallAlert />}
      <BlogList posts={posts} categories={categoriesToMap(cats)} didYouKnow={dyk} popularity={popularity} />
    </div>
  );
}
