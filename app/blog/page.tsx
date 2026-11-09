import type { Metadata } from "next";
import { isSuperAdmin } from "@/lib/admin-auth";
import {
  categoriesToMap,
  getPinConfig,
  listPublicCategories,
  listPublicDidYouKnow,
  listPublicPosts,
  listReactions,
  resolvePinnedPosts,
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
  const [posts, cats, dyk, popularity, superAdmin, pinConfig] = await Promise.all([
    listPublicPosts(),
    listPublicCategories(),
    listPublicDidYouKnow(),
    listReactions(),
    isSuperAdmin(),
    getPinConfig(),
  ]);

  const pinnedPosts = resolvePinnedPosts(posts, pinConfig, popularity);

  return (
    <div className="blog-wrap">
      {superAdmin && <AutoStallAlert />}
      <BlogList
        posts={posts}
        categories={categoriesToMap(cats)}
        didYouKnow={dyk}
        popularity={popularity}
        pinnedSlugs={pinnedPosts.map((p) => p.slug)}
      />
    </div>
  );
}
