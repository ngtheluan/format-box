import BlogAdminTool from "./BlogAdminTool";
import { listAdminCategories, listAdminDidYouKnow, listAdminPosts } from "@/lib/blog";
import { availableProviders } from "@/lib/blog-ai";

export const dynamic = "force-dynamic";

export default async function BlogAdminPage() {
  const [posts, categories, didYouKnow] = await Promise.all([
    listAdminPosts(),
    listAdminCategories(),
    listAdminDidYouKnow(),
  ]);
  return (
    <BlogAdminTool
      initialPosts={posts}
      initialCategories={categories}
      initialDidYouKnow={didYouKnow}
      providers={availableProviders()}
    />
  );
}
