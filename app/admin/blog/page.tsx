import BlogAdminTool from "./BlogAdminTool";
import { listAdminCategories, listAdminPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

export default async function BlogAdminPage() {
  const [posts, categories] = await Promise.all([listAdminPosts(), listAdminCategories()]);
  return <BlogAdminTool initialPosts={posts} initialCategories={categories} />;
}
